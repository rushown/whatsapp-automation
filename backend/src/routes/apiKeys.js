const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getSupabase } = require('../lib/supabase');

const router = express.Router();

async function getKeys(userId) {
  const sb = getSupabase();
  if (!sb) return {};
  const { data } = await sb.from('api_keys').select('*').eq('user_id', userId).maybeSingle();
  if (!data) return {};
  return {
    whatsappToken:      data.whatsapp_token,
    phoneNumberId:      data.phone_number_id,
    businessAccountId:  data.business_account_id,
    groqApiKey:         data.groq_api_key,
    deepseekApiKey:     data.deepseek_api_key,
    openaiApiKey:       data.openai_api_key,
    elevenLabsApiKey:   data.elevenlabs_api_key,
    webhookVerifyToken: data.webhook_verify_token,
  };
}

async function saveKeys(userId, keys) {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from('api_keys').upsert({
    user_id:              userId,
    whatsapp_token:       keys.whatsappToken      || null,
    phone_number_id:      keys.phoneNumberId      || null,
    business_account_id:  keys.businessAccountId  || null,
    groq_api_key:         keys.groqApiKey         || null,
    deepseek_api_key:     keys.deepseekApiKey     || null,
    openai_api_key:       keys.openaiApiKey       || null,
    elevenlabs_api_key:   keys.elevenLabsApiKey   || null,
    webhook_verify_token: keys.webhookVerifyToken || null,
    updated_at:           new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

async function deleteKey(userId, keyName) {
  const sb = getSupabase();
  if (!sb) return;
  const colMap = {
    whatsappToken:      'whatsapp_token',
    phoneNumberId:      'phone_number_id',
    businessAccountId:  'business_account_id',
    groqApiKey:         'groq_api_key',
    deepseekApiKey:     'deepseek_api_key',
    openaiApiKey:       'openai_api_key',
    elevenLabsApiKey:   'elevenlabs_api_key',
    webhookVerifyToken: 'webhook_verify_token',
  };
  const col = colMap[keyName];
  if (!col) return;
  await sb.from('api_keys').update({ [col]: null, updated_at: new Date().toISOString() }).eq('user_id', userId);
}

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
      hasWhatsappToken:     !!keys.whatsappToken,
      hasPhoneNumberId:     !!keys.phoneNumberId,
      hasBusinessAccountId: !!keys.businessAccountId,
      hasGroqApiKey:        !!keys.groqApiKey,
      hasWebhookToken:      !!keys.webhookVerifyToken,
      phoneNumberId:        keys.phoneNumberId      || '',
      businessAccountId:    keys.businessAccountId  || '',
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

    const isMasked = val => typeof val === 'string' && val.includes('****');

    const existing = await getKeys(req.user.id);
    const merged = {
      whatsappToken:      (!isMasked(whatsappToken)      && whatsappToken)      || existing.whatsappToken,
      phoneNumberId:      (!isMasked(phoneNumberId)      && phoneNumberId)      || existing.phoneNumberId,
      businessAccountId:  (!isMasked(businessAccountId)  && businessAccountId)  || existing.businessAccountId,
      groqApiKey:         (!isMasked(groqApiKey)         && groqApiKey)         || existing.groqApiKey,
      deepseekApiKey:     (!isMasked(deepseekApiKey)     && deepseekApiKey)     || existing.deepseekApiKey,
      openaiApiKey:       (!isMasked(openaiApiKey)       && openaiApiKey)       || existing.openaiApiKey,
      webhookVerifyToken: (!isMasked(webhookVerifyToken) && webhookVerifyToken) || existing.webhookVerifyToken,
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