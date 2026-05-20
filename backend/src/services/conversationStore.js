const { getSupabase } = require('../lib/supabase');
const logger = require('../lib/logger');

/**
 * Reuse open conversation per phone instead of creating one per message.
 */
async function getOrCreateConversation(phone, status = 'open') {
  const sb = getSupabase();
  if (!sb) return null;

  const { data: existing } = await sb
    .from('conversations')
    .select('id, status')
    .eq('phone', phone)
    .in('status', ['open', 'collecting'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    await sb
      .from('conversations')
      .update({ updated_at: new Date().toISOString(), status })
      .eq('id', existing.id);
    return existing.id;
  }

  const { data: created, error } = await sb
    .from('conversations')
    .insert({ phone, status })
    .select('id')
    .single();

  if (error) {
    logger.error('Create conversation failed', { error: error.message });
    return null;
  }
  return created.id;
}

module.exports = { getOrCreateConversation };
