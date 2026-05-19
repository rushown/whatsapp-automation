const express = require('express');
const axios = require('axios');
const { authenticate } = require('../middleware/auth');
const { apiKeys, messages, uuidv4 } = require('../store');

const router = express.Router();

const getKeys = (userId) => apiKeys[userId] || {};

const metaAPI = (token, version = 'v18.0') =>
  axios.create({
    baseURL: `https://graph.facebook.com/${version}`,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  });

// Send text message
router.post('/send', authenticate, async (req, res) => {
  try {
    const { to, message, type = 'text' } = req.body;
    const keys = getKeys(req.user.id);
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
    const keys = getKeys(req.user.id);
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
    const keys = getKeys(req.user.id);
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
    const keys = getKeys(req.user.id);
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
    const keys = getKeys(req.user.id);
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

// AI Reply using Groq
router.post('/ai-reply', authenticate, async (req, res) => {
  try {
    const { incomingMessage, context = '' } = req.body;
    const keys = getKeys(req.user.id);
    if (!keys.groqApiKey) {
      return res.status(400).json({ error: 'Groq API key not configured' });
    }
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: `You are a helpful WhatsApp business assistant. Respond professionally and concisely. ${context}`
          },
          { role: 'user', content: incomingMessage }
        ],
        max_tokens: 300,
        temperature: 0.7
      },
      { headers: { Authorization: `Bearer ${keys.groqApiKey}`, 'Content-Type': 'application/json' } }
    );
    const reply = response.data.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    res.status(400).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// Mark message as read
router.post('/mark-read', authenticate, async (req, res) => {
  try {
    const { messageId } = req.body;
    const keys = getKeys(req.user.id);
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