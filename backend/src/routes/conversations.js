const express = require('express');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const { getSupabase } = require('../lib/supabase');

const router = express.Router();
router.use(authenticate, adminOnly);

router.get('/', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.json([]);

  const { phone, limit = 50, offset = 0 } = req.query;
  let q = sb
    .from('conversations')
    .select('*, whatsapp_users(display_name), intents(name, slug)')
    .order('updated_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (phone) q = q.ilike('phone', `%${phone}%`);

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/messages', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.json([]);

  const { phone, conversationId, search, limit = 100 } = req.query;
  let q = sb
    .from('messages')
    .select('*, intents(name, slug)')
    .order('created_at', { ascending: false })
    .limit(Number(limit));

  if (phone) q = q.eq('phone', phone);
  if (conversationId) q = q.eq('conversation_id', conversationId);
  if (search) q = q.ilike('content', `%${search}%`);

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/collected-data', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.json([]);

  const { phone, sessionId, intentId } = req.query;
  let q = sb.from('collected_data').select('*').order('created_at', { ascending: false });

  if (phone) q = q.eq('phone', phone);
  if (sessionId) q = q.eq('session_id', sessionId);
  if (intentId) q = q.eq('intent_id', intentId);

  const { data, error } = await q.limit(200);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
