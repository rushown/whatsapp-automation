const express = require('express');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const { getSupabase } = require('../lib/supabase');
const { config } = require('../config');

const router = express.Router();
router.use(authenticate, adminOnly);

router.get('/', async (req, res) => {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.from('bot_config').select('*').eq('key', 'default').maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || {});
  }
  res.json({
    default_intent_threshold: config.defaultIntentThreshold,
    ai_provider: 'groq',
    elevenlabs_voice_id: config.elevenlabs.voiceId,
    elevenlabs_stability: config.elevenlabs.stability,
    elevenlabs_similarity_boost: config.elevenlabs.similarityBoost,
  });
});

router.put('/', async (req, res) => {
  const sb = getSupabase();
  const allowed = [
    'default_intent_threshold',
    'global_silence',
    'ai_provider',
    'ai_system_prompt',
    'meta_phone_number_id',
    'meta_business_account_id',
    'elevenlabs_voice_id',
    'elevenlabs_stability',
    'elevenlabs_similarity_boost',
    'embedding_model',
    'whatsapp_api_version',
  ];
  const updates = { updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  const secretFields = {
    meta_access_token_encrypted: 'metaToken',
    groq_api_key_encrypted: 'groqApiKey',
    deepseek_api_key_encrypted: 'deepseekApiKey',
    openai_api_key_encrypted: 'openaiApiKey',
    elevenlabs_api_key_encrypted: 'elevenlabsApiKey',
  };
  for (const [dbKey, bodyKey] of Object.entries(secretFields)) {
    if (req.body[bodyKey]) updates[dbKey] = req.body[bodyKey];
  }

  if (sb) {
    const { data, error } = await sb
      .from('bot_config')
      .upsert({ key: 'default', ...updates }, { onConflict: 'key' })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  }
  res.json(updates);
});

module.exports = router;
