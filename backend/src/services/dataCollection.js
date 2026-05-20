const { getSupabase } = require('../lib/supabase');
const { parseFieldValue } = require('./aiProvider');
const logger = require('../lib/logger');

const memorySessions = new Map();

async function getActiveSession(phone) {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from('collection_sessions')
      .select('*, intents(*)')
      .eq('phone', phone)
      .eq('status', 'active')
      .maybeSingle();
    return data;
  }
  return memorySessions.get(phone) || null;
}

async function createSession(phone, intentId, conversationId) {
  const sb = getSupabase();
  const row = {
    phone,
    intent_id: intentId,
    conversation_id: conversationId,
    current_field_index: 0,
    status: 'active',
  };
  if (sb) {
    const { data, error } = await sb.from('collection_sessions').insert(row).select().single();
    if (error) throw error;
    return data;
  }
  const session = { id: `mem-${Date.now()}`, ...row, intents: null };
  memorySessions.set(phone, session);
  return session;
}

async function saveCollectedField(sessionId, phone, intentId, field, value) {
  const sb = getSupabase();
  const row = {
    session_id: sessionId,
    phone,
    intent_id: intentId,
    field_key: field.key,
    field_label: field.label || field.key,
    value: String(value),
    validated: true,
  };
  if (sb) {
    const { error } = await sb.from('collected_data').insert(row);
    if (error) throw error;
    return row;
  }
  return row;
}

async function advanceSession(sessionId, nextIndex, status = 'active') {
  const sb = getSupabase();
  const updates = { current_field_index: nextIndex, status, updated_at: new Date().toISOString() };
  if (sb) {
    await sb.from('collection_sessions').update(updates).eq('id', sessionId);
    return;
  }
  for (const [phone, s] of memorySessions) {
    if (s.id === sessionId) {
      Object.assign(s, updates);
      if (status !== 'active') memorySessions.delete(phone);
    }
  }
}

async function getCollectedPayload(sessionId) {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from('collected_data').select('*').eq('session_id', sessionId);
    const payload = {};
    for (const row of data || []) payload[row.field_key] = row.value;
    return payload;
  }
  return {};
}

/**
 * Handle one step of data collection. Saves to DB before returning next question.
 */
async function processCollectionStep(phone, messageText, session, intent, aiOptions) {
  const fields = intent.collection_fields || [];
  if (!fields.length) return { done: true, payload: {} };

  const idx = session.current_field_index ?? 0;
  const field = fields[idx];

  if (!field) {
    await advanceSession(session.id, idx, 'completed');
    const payload = await getCollectedPayload(session.id);
    return { done: true, payload };
  }

  const parsed = await parseFieldValue(
    messageText,
    field,
    aiOptions.provider,
    aiOptions.apiKey
  );

  if (parsed.valid === false || (parsed.value === null && parsed.error)) {
    return {
      done: false,
      reply: parsed.error || `Please provide a valid ${field.label}.`,
      retry: true,
    };
  }

  const value = parsed.value ?? messageText.trim();
  await saveCollectedField(session.id, phone, intent.id, field, value);

  const nextIdx = idx + 1;
  if (nextIdx >= fields.length) {
    await advanceSession(session.id, nextIdx, 'completed');
    const payload = await getCollectedPayload(session.id);
    return { done: true, payload };
  }

  await advanceSession(session.id, nextIdx);
  const nextField = fields[nextIdx];
  return {
    done: false,
    reply: nextField.prompt || `Please share your ${nextField.label}:`,
  };
}

function getFirstQuestion(intent) {
  const fields = intent.collection_fields || [];
  const f = fields[0];
  if (!f) return null;
  return f.prompt || `Let's get started. What is your ${f.label}?`;
}

module.exports = {
  getActiveSession,
  createSession,
  processCollectionStep,
  getCollectedPayload,
  getFirstQuestion,
  advanceSession,
};
