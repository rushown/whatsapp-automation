const express = require('express');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const { getSupabase } = require('../lib/supabase');
const { buildIntentEmbedding } = require('../services/embeddings');
const { config } = require('../config');
const { setMemoryIntents } = require('../services/intentMatcher');
const { invalidateIntentCache } = require('../services/intentCache');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
router.use(authenticate, adminOnly);

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// List intents
router.get('/', async (req, res) => {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('intents')
      .select('*, intent_examples(id, utterance)')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }
  res.json(req.app.locals.memoryIntents || []);
});

// Get one
router.get('/:id', async (req, res) => {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('intents')
      .select('*, intent_examples(*)')
      .eq('id', req.params.id)
      .single();
    if (error) return res.status(404).json({ error: 'Intent not found' });
    return res.json(data);
  }
  const intent = (req.app.locals.memoryIntents || []).find((i) => i.id === req.params.id);
  if (!intent) return res.status(404).json({ error: 'Intent not found' });
  res.json(intent);
});

// Create
router.post('/', async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      workflow_type = 'text',
      response_text,
      response_voice_script,
      threshold,
      is_active = true,
      http_url,
      http_method,
      http_headers,
      collection_fields,
      examples = [],
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const intentSlug = slug || slugify(name);
    let embedding = null;

    if (config.openai.apiKey && examples.length) {
      embedding = await buildIntentEmbedding(
        { name, description },
        examples,
        config.openai.apiKey
      );
    }

    const sb = getSupabase();
    if (sb) {
      const { data: intent, error } = await sb
        .from('intents')
        .insert({
          name,
          slug: intentSlug,
          description,
          workflow_type,
          response_text,
          response_voice_script,
          threshold: threshold ?? config.defaultIntentThreshold,
          is_active,
          http_url,
          http_method,
          http_headers,
          collection_fields: collection_fields || [],
          embedding,
        })
        .select()
        .single();
      if (error) return res.status(400).json({ error: error.message });

      for (const utterance of examples) {
        let exEmb = null;
        if (config.openai.apiKey) {
          const { createEmbedding } = require('../services/embeddings');
          exEmb = await createEmbedding(utterance);
        }
        await sb.from('intent_examples').insert({
          intent_id: intent.id,
          utterance,
          embedding: exEmb,
        });
      }
      invalidateIntentCache();
      return res.status(201).json(intent);
    }

    const intent = {
      id: uuidv4(),
      name,
      slug: intentSlug,
      description,
      workflow_type,
      response_text,
      response_voice_script,
      threshold: threshold ?? config.defaultIntentThreshold,
      is_active,
      collection_fields: collection_fields || [],
      examples,
      embedding,
    };
    const list = req.app.locals.memoryIntents || [];
    list.push(intent);
    req.app.locals.memoryIntents = list;
    setMemoryIntents(list);
    invalidateIntentCache();
    res.status(201).json(intent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id;
    delete updates.examples;

    const sb = getSupabase();
    if (sb) {
      if (req.body.examples?.length && config.openai.apiKey) {
        updates.embedding = await buildIntentEmbedding(
          { name: updates.name || req.body.name, description: updates.description },
          req.body.examples,
          config.openai.apiKey
        );
        await sb.from('intent_examples').delete().eq('intent_id', req.params.id);
        const { createEmbedding } = require('../services/embeddings');
        for (const utterance of req.body.examples) {
          const exEmb = await createEmbedding(utterance);
          await sb.from('intent_examples').insert({
            intent_id: req.params.id,
            utterance,
            embedding: exEmb,
          });
        }
      }
      const { data, error } = await sb
        .from('intents')
        .update(updates)
        .eq('id', req.params.id)
        .select()
        .single();
      if (error) return res.status(400).json({ error: error.message });
      invalidateIntentCache();
      return res.json(data);
    }
    res.status(501).json({ error: 'Supabase required for updates in production' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from('intents').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    invalidateIntentCache();
    return res.json({ success: true });
  }
  const list = (req.app.locals.memoryIntents || []).filter((i) => i.id !== req.params.id);
  req.app.locals.memoryIntents = list;
  setMemoryIntents(list);
  invalidateIntentCache();
  res.json({ success: true });
});

// Refresh embeddings
router.post('/:id/refresh-embedding', async (req, res) => {
  if (!config.openai.apiKey) {
    return res.status(400).json({ error: 'OPENAI_API_KEY required' });
  }
  const sb = getSupabase();
  if (!sb) return res.status(501).json({ error: 'Supabase required' });

  const { data: intent } = await sb
    .from('intents')
    .select('*, intent_examples(utterance)')
    .eq('id', req.params.id)
    .single();
  if (!intent) return res.status(404).json({ error: 'Not found' });

  const embedding = await buildIntentEmbedding(
    intent,
    (intent.intent_examples || []).map((e) => e.utterance),
    config.openai.apiKey
  );
  const { data, error } = await sb
    .from('intents')
    .update({ embedding, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  invalidateIntentCache();
  res.json(data);
});

module.exports = router;
