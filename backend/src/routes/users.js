const express = require('express');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const { getSupabase } = require('../lib/supabase');

const router = express.Router();
router.use(authenticate, adminOnly);

router.get('/whatsapp', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.json([]);

  const { search, blocked } = req.query;
  let q = sb.from('whatsapp_users').select('*').order('created_at', { ascending: false });

  if (search) q = q.or(`phone.ilike.%${search}%,display_name.ilike.%${search}%`);
  if (blocked !== undefined) q = q.eq('blocked', blocked === 'true');

  const { data, error } = await q.limit(200);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/whatsapp/:id/block', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(501).json({ error: 'Supabase required' });

  const { blocked } = req.body;
  const { data, error } = await sb
    .from('whatsapp_users')
    .update({ blocked: Boolean(blocked), updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.get('/whatsapp/:phone/export', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(501).json({ error: 'Supabase required' });

  const phone = req.params.phone;
  const [messages, collected] = await Promise.all([
    sb.from('messages').select('*').eq('phone', phone).order('created_at'),
    sb.from('collected_data').select('*').eq('phone', phone).order('created_at'),
  ]);

  res.json({
    phone,
    messages: messages.data || [],
    collectedData: collected.data || [],
  });
});

router.get('/admins', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.json([]);
  const { data, error } = await sb.from('profiles').select('id, name, email, role, blocked, created_at');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
