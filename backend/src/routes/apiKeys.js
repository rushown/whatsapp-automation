const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getKeys, saveKeys, deleteKey } = require('../lib/db');

const router = express.Router();

// Get API keys (masked)
router.get('/', authenticate, async (req, res) => {
  try {
    const keys = await getKeys(req.user.id);
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get raw keys (for use in service calls - internal)
router.get('/raw', authenticate, async (req, res) => {
  try {
    const keys = await getKeys(req.user.id);
    res.json({
      hasWhatsappToken: !!keys.whatsappToken,
      hasPhoneNumberId: !!keys.phoneNumberId,
      hasBusinessAccountId: !!keys.businessAccountId,
      hasGroqApiKey: !!keys.groqApiKey,
      hasWebhookToken: !!keys.webhookVerifyToken,
      phoneNumberId: keys.phoneNumberId || '',
      businessAccountId: keys.businessAccountId || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save API keys
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      whatsappToken,
      phoneNumberId,
      businessAccountId,
      groqApiKey,
      deepseekApiKey,
      openaiApiKey,
      webhookVerifyToken,
    } = req.body;

    // Merge with existing so partial updates don't wipe other keys
    const existing = await getKeys(req.user.id);
    const merged = {
      whatsappToken:     whatsappToken     || existing.whatsappToken,
      phoneNumberId:     phoneNumberId     || existing.phoneNumberId,
      businessAccountId: businessAccountId || existing.businessAccountId,
      groqApiKey:        groqApiKey        || existing.groqApiKey,
      deepseekApiKey:    deepseekApiKey    || existing.deepseekApiKey,
      openaiApiKey:      openaiApiKey      || existing.openaiApiKey,
      webhookVerifyToken: webhookVerifyToken || existing.webhookVerifyToken,
    };

    await saveKeys(req.user.id, merged);
    res.json({ success: true, message: 'API keys saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a specific key
router.delete('/:keyName', authenticate, async (req, res) => {
  try {
    await deleteKey(req.user.id, req.params.keyName);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;