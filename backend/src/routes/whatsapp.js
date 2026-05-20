const express = require('express');
const axios = require('axios');
const { authenticate } = require('../middleware/auth');
const { messages, uuidv4 } = require('../store');
const { getKeys } = require('../lib/db');

const router = express.Router();


const metaAPI = (token, version = 'v18.0') =>
  axios.create({
    baseURL: `https://graph.facebook.com/${version}`,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  });

// Send text message
router.post('/send', authenticate, async (req, res) => {
  try {
    const { to, message, type = 'text' } = req.body;
    const keys = await getKeys(req.user.id);
    if (!keys.whatsappToken || !keys.phoneNumberId) {
      return res.status(400).json({ error: 'WhatsApp API credentials not configured' });
    }
    const api = metaAPI(keys.whatsappToken);
    let payload;
    if (type === 'text') {
      payload = { messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { preview_url: false, body: message } };
    } else if (type === 'template') {
      payload = req.body.templatePayload;
    }
    const response = await api.post(`/${keys.phoneNumberId}/messages`, payload);
    
    // Store message
    if (!messages[req.user.id]) messages[req.user.id] = [];
    messages[req.user.id].push({
      id: uuidv4(),
      to,
      message,
      type,
      status: 'sent',
      messageId: response.data?.messages?.[0]?.id,
      timestamp: new Date().toISOString(),
      direction: 'outbound'
    });

    res.json({ success: true, data: response.data });
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    res.status(400).json({ error: errMsg });
  }
});

// Send template message
router.post('/send-template', authenticate, async (req, res) => {
  try {
    const { to, templateName, languageCode = 'en_US', components = [] } = req.body;
    const keys = await getKeys(req.user.id);
    if (!keys.whatsappToken || !keys.phoneNumberId) {
      return res.status(400).json({ error: 'WhatsApp API credentials not configured' });
    }
    const api = metaAPI(keys.whatsappToken);
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: templateName, language: { code: languageCode }, components }
    };
    const response = await api.post(`/${keys.phoneNumberId}/messages`, payload);
    res.json({ success: true, data: response.data });
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    res.status(400).json({ error: errMsg });
  }
});

// Send media message
router.post('/send-media', authenticate, async (req, res) => {
  try {
    const { to, mediaType, mediaUrl, caption } = req.body;
    const keys = await getKeys(req.user.id);
    if (!keys.whatsappToken || !keys.phoneNumberId) {
      return res.status(400).json({ error: 'WhatsApp API credentials not configured' });
    }
    const api = metaAPI(keys.whatsappToken);
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: mediaType,
      [mediaType]: { link: mediaUrl, ...(caption && { caption }) }
    };
    const response = await api.post(`/${keys.phoneNumberId}/messages`, payload);
    res.json({ success: true, data: response.data });
  } catch (err) {
    res.status(400).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// Get message history
router.get('/messages', authenticate, (req, res) => {
  const userMessages = messages[req.user.id] || [];
  res.json(userMessages.slice(-100).reverse());
});

// Get WhatsApp templates from Meta
router.get('/meta-templates', authenticate, async (req, res) => {
  try {
    const keys = await getKeys(req.user.id);
    if (!keys.whatsappToken || !keys.businessAccountId) {
      return res.status(400).json({ error: 'WhatsApp API credentials not configured' });
    }
    const api = metaAPI(keys.whatsappToken);
    const response = await api.get(`/${keys.businessAccountId}/message_templates`);
    res.json(response.data);
  } catch (err) {
    res.status(400).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// Get phone number info
router.get('/phone-info', authenticate, async (req, res) => {
  try {
    const keys = await getKeys(req.user.id);
    if (!keys.whatsappToken || !keys.phoneNumberId) {
      return res.status(400).json({ error: 'WhatsApp API credentials not configured' });
    }
    const api = metaAPI(keys.whatsappToken);
    const response = await api.get(`/${keys.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,status`);
    res.json(response.data);
  } catch (err) {
    res.status(400).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// Admin-only: draft a reply (NOT the live webhook bot — no intent gate here)
router.post('/ai-reply', authenticate, async (req, res) => {
  try {
    const { incomingMessage, context = '', provider: reqProvider } = req.body;
    const keys = await getKeys(req.user.id);
    const { getSupabase } = require('../lib/supabase');
    const { chatCompletion, HUMAN_SYSTEM_PROMPT } = require('../services/aiProvider');

    let provider = reqProvider || 'groq';
    let apiKey = keys.groqApiKey;
    if (provider === 'deepseek') apiKey = keys.deepseekApiKey;
    if (provider === 'openai') apiKey = keys.openaiApiKey;

    const sb = getSupabase();
    if (sb) {
      const { data: botCfg } = await sb.from('bot_config').select('ai_provider, groq_api_key_encrypted, deepseek_api_key_encrypted, openai_api_key_encrypted, ai_system_prompt').eq('key', 'default').maybeSingle();
      if (botCfg) {
        provider = botCfg.ai_provider || provider;
        if (provider === 'deepseek') apiKey = botCfg.deepseek_api_key_encrypted || apiKey;
        else if (provider === 'openai') apiKey = botCfg.openai_api_key_encrypted || apiKey;
        else apiKey = botCfg.groq_api_key_encrypted || apiKey;
      }
    }

    if (!apiKey) {
      return res.status(400).json({ error: `${provider} API key not configured` });
    }

    const reply = await chatCompletion({
      provider,
      apiKey,
      messages: [{ role: 'user', content: incomingMessage }],
      systemPrompt: `${HUMAN_SYSTEM_PROMPT}\n\nAdditional context: ${context}`,
      maxTokens: 300,
      temperature: 0.5,
    });
    res.json({ reply, provider });
  } catch (err) {
    res.status(400).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// Mark message as read
router.post('/mark-read', authenticate, async (req, res) => {
  try {
    const { messageId } = req.body;
    const keys = await getKeys(req.user.id);
    if (!keys.whatsappToken || !keys.phoneNumberId) {
      return res.status(400).json({ error: 'WhatsApp API credentials not configured' });
    }
    const api = metaAPI(keys.whatsappToken);
    const response = await api.post(`/${keys.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId
    });
    res.json({ success: true, data: response.data });
  } catch (err) {
    res.status(400).json({ error: err.response?.data?.error?.message || err.message });
  }
});

module.exports = router;