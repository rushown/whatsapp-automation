const { getSupabase } = require('../lib/supabase');
const { config } = require('../config');
const logger = require('../lib/logger');
const { isDuplicate } = require('../lib/messageDedup');
const { isRateLimited } = require('../lib/rateLimitPhone');
const { matchIntent } = require('./intentMatcher');
const { getOrCreateConversation } = require('./conversationStore');
const {
  getActiveSession,
  createSession,
  processCollectionStep,
  getFirstQuestion,
} = require('./dataCollection');
const { personalizeResponse } = require('./aiProvider');
const whatsapp = require('./whatsappMeta');
const elevenLabs = require('./elevenLabs');
const axios = require('axios');

function envBotConfig() {
  return {
    default_intent_threshold: config.defaultIntentThreshold,
    ai_provider: process.env.AI_PROVIDER || 'groq',
    ai_system_prompt: process.env.AI_SYSTEM_PROMPT || null,
    meta_access_token_encrypted: config.meta.token,
    meta_phone_number_id: config.meta.phoneNumberId,
    groq_api_key_encrypted: config.groq.apiKey,
    deepseek_api_key_encrypted: config.deepseek.apiKey,
    openai_api_key_encrypted: config.openai.apiKey,
    elevenlabs_api_key_encrypted: config.elevenlabs.apiKey,
    elevenlabs_voice_id: config.elevenlabs.voiceId,
    elevenlabs_stability: config.elevenlabs.stability,
    elevenlabs_similarity_boost: config.elevenlabs.similarityBoost,
  };
}

async function getBotConfig() {
  const envCfg = envBotConfig();
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from('bot_config').select('*').eq('key', 'default').maybeSingle();
    if (data) {
      return {
        ...envCfg,
        ...data,
        meta_access_token_encrypted: data.meta_access_token_encrypted || envCfg.meta_access_token_encrypted,
        meta_phone_number_id: data.meta_phone_number_id || envCfg.meta_phone_number_id,
        groq_api_key_encrypted: data.groq_api_key_encrypted || envCfg.groq_api_key_encrypted,
        deepseek_api_key_encrypted: data.deepseek_api_key_encrypted || envCfg.deepseek_api_key_encrypted,
        openai_api_key_encrypted: data.openai_api_key_encrypted || envCfg.openai_api_key_encrypted,
        elevenlabs_api_key_encrypted: data.elevenlabs_api_key_encrypted || envCfg.elevenlabs_api_key_encrypted,
      };
    }
  }
  return envCfg;
}

async function trackEvent(eventType, phone, intentId, metadata = {}) {
  const sb = getSupabase();
  if (sb) {
    await sb.from('analytics_events').insert({
      event_type: eventType,
      phone,
      intent_id: intentId || null,
      metadata,
    });
  }
}

async function ensureWhatsappUser(phone) {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: existing } = await sb
    .from('whatsapp_users')
    .select('id, blocked')
    .eq('phone', phone)
    .maybeSingle();
  if (existing?.blocked) return { blocked: true };
  if (existing) return existing;
  const { data } = await sb.from('whatsapp_users').insert({ phone }).select().single();
  return data;
}

async function logMessage(phone, direction, content, extra = {}) {
  const sb = getSupabase();
  if (!sb) return null;

  const conversationId =
    extra.conversationId || (await getOrCreateConversation(phone, extra.conversationStatus || 'open'));

  const { error } = await sb.from('messages').insert({
    conversation_id: conversationId,
    phone,
    direction,
    message_type: extra.messageType || 'text',
    content: content || '',
    meta_message_id: extra.metaMessageId,
    intent_id: extra.intentId,
    intent_score: extra.intentScore,
    status: extra.status || (direction === 'outbound' ? 'sent' : 'received'),
    metadata: extra.metadata || {},
  });

  if (error) logger.error('logMessage failed', { error: error.message });
  return conversationId;
}

function extractText(msg) {
  if (msg.type === 'text') return msg.text?.body || '';
  if (msg.type === 'button') return msg.button?.text || '';
  if (msg.type === 'interactive') {
    return (
      msg.interactive?.button_reply?.title ||
      msg.interactive?.list_reply?.title ||
      msg.interactive?.nfm_reply?.body ||
      ''
    );
  }
  return '';
}

function resolveAiKey(botCfg) {
  const provider = botCfg.ai_provider || 'groq';
  if (provider === 'deepseek') {
    return { provider, apiKey: botCfg.deepseek_api_key_encrypted || config.deepseek.apiKey };
  }
  if (provider === 'openai') {
    return { provider, apiKey: botCfg.openai_api_key_encrypted || config.openai.apiKey };
  }
  return { provider, apiKey: botCfg.groq_api_key_encrypted || config.groq.apiKey };
}

async function executeHttpWorkflow(intent, payload, phone) {
  if (!intent.http_url) return;
  await axios({
    method: intent.http_method || 'POST',
    url: intent.http_url,
    headers: { 'Content-Type': 'application/json', ...(intent.http_headers || {}) },
    data: { phone, collected: payload, timestamp: new Date().toISOString() },
    timeout: 30000,
  });
}

async function sendVoiceReply(phone, text, botCfg, metaToken, phoneNumberId) {
  const audioPath = await elevenLabs.synthesizeSpeech(text, {
    apiKey: botCfg.elevenlabs_api_key_encrypted || config.elevenlabs.apiKey,
    voiceId: botCfg.elevenlabs_voice_id,
    stability: botCfg.elevenlabs_stability,
    similarityBoost: botCfg.elevenlabs_similarity_boost,
  });
  try {
    await whatsapp.retry(() =>
      whatsapp.sendVoiceFromFile(phone, audioPath, metaToken, phoneNumberId)
    );
    await trackEvent('voice_sent', phone);
  } finally {
    elevenLabs.cleanupAudioFile(audioPath);
  }
}

async function fulfillIntent(phone, intent, userMessage, botCfg, metaToken, phoneNumberId, collectedPayload = {}) {
  const aiOpts = resolveAiKey(botCfg);
  let replyText = intent.response_text || '';

  if (intent.workflow_type === 'http') {
    await executeHttpWorkflow(intent, collectedPayload, phone);
    replyText = replyText || 'Your request has been submitted. We will be in touch soon.';
  } else if (intent.workflow_type === 'collect_data' && Object.keys(collectedPayload).length) {
    replyText = replyText || 'Thank you! We have received your information.';
  }

  const useAiPolish =
    replyText &&
    aiOpts.apiKey &&
    botCfg.ai_provider &&
    intent.workflow_type !== 'voice';

  if (useAiPolish) {
    try {
      replyText = await personalizeResponse(
        replyText,
        userMessage,
        aiOpts.provider,
        aiOpts.apiKey,
        botCfg.ai_system_prompt
      );
    } catch (err) {
      logger.warn('AI personalize skipped', { error: err.message });
    }
  }

  if (intent.workflow_type === 'voice') {
    const script = intent.response_voice_script || replyText;
    if (script) {
      await sendVoiceReply(phone, script, botCfg, metaToken, phoneNumberId);
      await logMessage(phone, 'outbound', script, { intentId: intent.id, messageType: 'audio' });
      await trackEvent('intent_matched', phone, intent.id, { workflow: 'voice' });
      return { handled: true };
    }
  }

  if (replyText) {
    await whatsapp.retry(() => whatsapp.sendText(phone, replyText, metaToken, phoneNumberId));
    await logMessage(phone, 'outbound', replyText, { intentId: intent.id });
    await trackEvent('intent_matched', phone, intent.id, { workflow: intent.workflow_type });
    return { handled: true };
  }

  return { handled: false };
}

async function startDataCollection(phone, intent, metaToken, phoneNumberId, score) {
  const question = getFirstQuestion(intent);
  if (!question) return false;

  await createSession(phone, intent.id);
  await getOrCreateConversation(phone, 'collecting');
  await whatsapp.sendText(phone, question, metaToken, phoneNumberId);
  await logMessage(phone, 'outbound', question, {
    intentId: intent.id,
    intentScore: score,
    conversationStatus: 'collecting',
  });
  await trackEvent('collection_started', phone, intent.id);
  return true;
}

async function processIncomingMessage(msg) {
  const phone = msg.from;
  const text = extractText(msg).trim();
  const messageId = msg.id;

  if (isDuplicate(messageId)) {
    logger.debug('Duplicate webhook message skipped', { messageId });
    return;
  }

  const botCfg = await getBotConfig();
  const metaToken = botCfg.meta_access_token_encrypted || config.meta.token;
  const phoneNumberId = botCfg.meta_phone_number_id || config.meta.phoneNumberId;

  if (!metaToken || !phoneNumberId) {
    logger.error('Meta credentials missing — cannot process webhook');
    return;
  }

  try {
    await whatsapp.markAsRead(messageId, metaToken, phoneNumberId);
  } catch {
    /* non-fatal */
  }

  if (isRateLimited(phone)) {
    logger.warn('Rate limited — silence', { phone });
    await trackEvent('rate_limited', phone);
    return;
  }

  const waUser = await ensureWhatsappUser(phone);
  if (waUser?.blocked) {
    logger.info('Blocked user — silence', { phone });
    return;
  }

  await logMessage(phone, 'inbound', text, { metaMessageId: messageId });

  if (!text) {
    logger.info('Non-text message — silence');
    await trackEvent('non_text_ignored', phone);
    return;
  }

  await trackEvent('message_received', phone);

  const activeSession = await getActiveSession(phone);
  if (activeSession) {
    const sb = getSupabase();
    let intent = activeSession.intents;
    if (!intent && sb) {
      const { data } = await sb.from('intents').select('*').eq('id', activeSession.intent_id).single();
      intent = data;
    }
    if (intent) {
      const aiOpts = resolveAiKey(botCfg);
      const step = await processCollectionStep(phone, text, activeSession, intent, aiOpts);
      if (step.retry || !step.done) {
        await whatsapp.sendText(phone, step.reply, metaToken, phoneNumberId);
        await logMessage(phone, 'outbound', step.reply, {
          intentId: intent.id,
          conversationStatus: 'collecting',
        });
        return;
      }
      await fulfillIntent(phone, intent, text, botCfg, metaToken, phoneNumberId, step.payload);
      return;
    }
  }

  const match = await matchIntent(text, {
    defaultThreshold: botCfg.default_intent_threshold,
    openaiApiKey: botCfg.openai_api_key_encrypted || config.openai.apiKey,
  });

  if (!match) {
    logger.info('No intent match — silence', { phone, preview: text.slice(0, 80) });
    await trackEvent('no_match', phone, null, { preview: text.slice(0, 120) });
    return;
  }

  const { intent, score } = match;
  logger.info('Intent matched', { intent: intent.slug || intent.name, score: score.toFixed(3) });

  if (intent.workflow_type === 'collect_data' && (intent.collection_fields || []).length) {
    const started = await startDataCollection(phone, intent, metaToken, phoneNumberId, score);
    if (started) return;
  }

  await fulfillIntent(phone, intent, text, botCfg, metaToken, phoneNumberId);
}

async function handleWebhookBody(body) {
  if (body.object !== 'whatsapp_business_account') return;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value?.messages) continue;
      for (const msg of value.messages) {
        try {
          await processIncomingMessage(msg);
        } catch (err) {
          logger.error('Webhook message processing failed', {
            error: err.message,
            stack: err.stack,
          });
        }
      }
    }
  }
}

module.exports = { handleWebhookBody, processIncomingMessage };
