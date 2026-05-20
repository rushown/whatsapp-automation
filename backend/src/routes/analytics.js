const express = require('express');
const { authenticate } = require('../middleware/auth');
const { messages, automations, contacts, templates } = require('../store');
const { getSupabase } = require('../lib/supabase');

const router = express.Router();

async function getSupabaseStats() {
  const sb = getSupabase();
  if (!sb) return null;

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceIso = since.toISOString();

  const [
    { count: totalMessages },
    { count: inbound },
    { count: outbound },
    { count: intentMatched },
    { count: voiceSent },
    { count: noMatch },
    { data: recentMessages },
  ] = await Promise.all([
    sb.from('messages').select('*', { count: 'exact', head: true }),
    sb.from('messages').select('*', { count: 'exact', head: true }).eq('direction', 'inbound'),
    sb.from('messages').select('*', { count: 'exact', head: true }).eq('direction', 'outbound'),
    sb.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'intent_matched'),
    sb.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'voice_sent'),
    sb.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'no_match'),
    sb.from('messages').select('created_at, direction').gte('created_at', sinceIso),
  ]);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const volumeByDay = last7Days.map((day) => ({
    date: day,
    sent: (recentMessages || []).filter(
      (m) => m.direction === 'outbound' && m.created_at?.startsWith(day)
    ).length,
    received: (recentMessages || []).filter(
      (m) => m.direction === 'inbound' && m.created_at?.startsWith(day)
    ).length,
  }));

  const { count: activeIntents } = await sb
    .from('intents')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  const { count: waUsers } = await sb
    .from('whatsapp_users')
    .select('*', { count: 'exact', head: true });

  return {
    totalMessages: totalMessages || 0,
    messagesSent: outbound || 0,
    messagesReceived: inbound || 0,
    intentsMatched: intentMatched || 0,
    voiceMessagesSent: voiceSent || 0,
    silentIgnored: noMatch || 0,
    totalContacts: waUsers || 0,
    activeIntents: activeIntents || 0,
    activeAutomations: 0,
    totalAutomations: 0,
    totalTemplates: 0,
    automationRuns: 0,
    volumeByDay,
    deliveryRate: outbound > 0 ? 95 : 0,
    openRate: inbound > 0 ? Math.min(99, Math.round(((intentMatched || 0) / inbound) * 100)) : 0,
  };
}

router.get('/overview', authenticate, async (req, res) => {
  const sbStats = await getSupabaseStats();
  if (sbStats) return res.json(sbStats);

  const userId = req.user.id;
  const userMessages = messages[userId] || [];
  const userAutomations = automations[userId] || [];
  const userContacts = contacts[userId] || [];
  const userTemplates = templates[userId] || [];

  const sent = userMessages.filter((m) => m.direction === 'outbound').length;
  const received = userMessages.filter((m) => m.direction === 'inbound').length;

  const now = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const volumeByDay = last7Days.map((day) => ({
    date: day,
    sent: userMessages.filter((m) => m.timestamp?.startsWith(day) && m.direction === 'outbound').length,
    received: userMessages.filter((m) => m.timestamp?.startsWith(day) && m.direction === 'inbound').length,
  }));

  res.json({
    totalMessages: userMessages.length,
    messagesSent: sent,
    messagesReceived: received,
    intentsMatched: 0,
    voiceMessagesSent: 0,
    silentIgnored: 0,
    totalContacts: userContacts.length,
    activeAutomations: userAutomations.filter((a) => a.isActive).length,
    totalAutomations: userAutomations.length,
    totalTemplates: userTemplates.length,
    automationRuns: userAutomations.reduce((sum, a) => sum + (a.runCount || 0), 0),
    volumeByDay,
    deliveryRate: sent > 0 ? 90 : 0,
    openRate: 0,
  });
});

module.exports = router;
