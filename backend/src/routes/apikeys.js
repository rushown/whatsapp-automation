const express = require('express');
const { authenticate } = require('../middleware/auth');
const { apiKeys } = require('../store');

const router = express.Router();

// Get API keys (masked)
router.get('/', authenticate, (req, res) => {
  const keys = apiKeys[req.user.id] || {};
  const masked = {};
  Object.keys(keys).forEach(k => {
    const val = keys[k];
    if (val && typeof val === 'string' && val.length > 8) {
      masked[k] = val.substring(0, 4) + '****' + val.substring(val.length - 4);
    } else {
      masked[k] = val ? '****' : '';
    }
  });
  res.json(masked);
});

// Get raw keys (for use in service calls - internal)
router.get('/raw', authenticate, (req, res) => {
  const keys = apiKeys[req.user.id] || {};
  res.json({
    hasWhatsappToken: !!keys.whatsappToken,
    hasPhoneNumberId: !!keys.phoneNumberId,
    hasBusinessAccountId: !!keys.businessAccountId,
    hasGroqApiKey: !!keys.groqApiKey,
    hasWebhookToken: !!keys.webhookVerifyToken,
    phoneNumberId: keys.phoneNumberId || '',
    businessAccountId: keys.businessAccountId || '',
  });
});

// Save API keys
router.post('/', authenticate, (req, res) => {
  try {
    const { whatsappToken, phoneNumberId, businessAccountId, groqApiKey, webhookVerifyToken } = req.body;
    if (!apiKeys[req.user.id]) apiKeys[req.user.id] = {};
    
    if (whatsappToken) apiKeys[req.user.id].whatsappToken = whatsappToken;
    if (phoneNumberId) apiKeys[req.user.id].phoneNumberId = phoneNumberId;
    if (businessAccountId) apiKeys[req.user.id].businessAccountId = businessAccountId;
    if (groqApiKey) apiKeys[req.user.id].groqApiKey = groqApiKey;
    if (webhookVerifyToken) apiKeys[req.user.id].webhookVerifyToken = webhookVerifyToken;
    
    res.json({ success: true, message: 'API keys saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a specific key
router.delete('/:keyName', authenticate, (req, res) => {
  if (apiKeys[req.user.id]) {
    delete apiKeys[req.user.id][req.params.keyName];
  }
  res.json({ success: true });
});

module.exports = router;