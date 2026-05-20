const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getSupabase } = require('../lib/supabase');
const { encrypt, decrypt } = require('../lib/encryption');

const router = express.Router();

// Decrypt all keys from DB row — only called when keys are actually needed
function decryptRow(data) {
  return {
    whatsappToken:      decrypt(data.whatsapp_token),
    phoneNumberId:      decrypt(data.phone_number_id),
    businessAccountId:  decrypt(data.business_account_id),
    groqApiKey:         decrypt(data.groq_api_key),
    deepseekApiKey:     decrypt(data.deepseek_api_key),
    openaiApiKey:       decrypt(data.openai_api_key),
    elevenLabsApiKey:   decrypt(data.elevenlabs_api_key),
    webhookVerifyToken: decrypt(data.webhook_verify_token),
  };
}

async function getKeys(userId) {
  const sb = getSupabase();
  if (!sb) return {};
  const { data, error } = await sb.from('api_keys').select('*').eq('user_id', userId).maybeSingle();
  if (error) console.error('[getKeys error]', error);
  if (!data) return {};
  return decryptRow(data);
}

async function saveKeys(userId, keys) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('api_keys').upsert({
    user_id:              userId,
    whatsapp_token:       encrypt(keys.whatsappToken)      || null,
    phone_number_id:      encrypt(keys.phoneNumberId)      || null,
    business_account_id:  encrypt(keys.businessAccountId)  || null,
    groq_api_key:         encrypt(keys.groqApiKey)         || null,
    deepseek_api_key:     encrypt(keys.deepseekApiKey)     || null,
    openai_api_key:       encrypt(keys.openaiApiKey)       || null,
    elevenlabs_api_key:   encrypt(keys.elevenLabsApiKey)   || null,
    webhook_verify_token: encrypt(keys.webhookVerifyToken) || null,
    updated_at:           new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) console.error('[saveKeys error]', error);
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
  const { error } = await sb.from('api_keys').update({ [col]: null, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (error) console.error('[deleteKey error]', error);
}

// Get API keys (masked) — decrypts then masks, never sends plaintext to frontend
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

// Get raw decrypted keys — internal use only for service calls
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

// Save API keys — encrypts before storing
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