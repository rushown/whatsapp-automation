const express = require('express');
const jwt = require('jsonwebtoken');
const { getSupabase } = require('../lib/supabase');
const { JWT_SECRET } = require('../middleware/auth');
const logger = require('../lib/logger');
const { config } = require('../config');
const whatsapp = require('../services/whatsappMeta');
const { isOtpRateLimited } = require('../lib/otpRateLimit');

const router = express.Router();

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizePhone(phone) {
  return String(phone).replace(/\D/g, '');
}

router.post('/otp/request', async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone || phone.length < 8) {
    return res.status(400).json({ error: 'Valid phone number required' });
  }

  const sb = getSupabase();
  if (!sb) {
    return res.status(503).json({ error: 'User portal requires Supabase' });
  }

  if (isOtpRateLimited(phone)) {
    return res.status(429).json({ error: 'Too many OTP requests. Try again later.' });
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await sb.from('user_otp').insert({ phone, code, expires_at: expiresAt });

  const token = config.meta.token;
  const phoneNumberId = config.meta.phoneNumberId;
  if (token && phoneNumberId) {
    try {
      await whatsapp.sendText(
        phone,
        `Your login code is: ${code}\n\nValid for 10 minutes. Do not share this code.`,
        token,
        phoneNumberId
      );
    } catch (err) {
      logger.error('OTP WhatsApp send failed', { error: err.message });
      return res.status(502).json({ error: 'Could not send OTP via WhatsApp' });
    }
    return res.json({ success: true, message: 'OTP sent to your WhatsApp number' });
  }

  if (config.nodeEnv === 'development') {
    logger.info('DEV OTP (no Meta token)', { phone, code });
    return res.json({ success: true, devCode: code });
  }

  return res.status(503).json({ error: 'WhatsApp not configured for OTP delivery' });
});

router.post('/otp/verify', async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const code = String(req.body?.code || '').trim();
  if (!phone || !code) return res.status(400).json({ error: 'Phone and code required' });

  const sb = getSupabase();
  if (!sb) {
    return res.status(503).json({ error: 'User portal requires Supabase' });
  }

  const { data } = await sb
    .from('user_otp')
    .select('*')
    .eq('phone', phone)
    .eq('code', code)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return res.status(401).json({ error: 'Invalid or expired OTP' });
  await sb.from('user_otp').update({ used: true }).eq('id', data.id);

  const token = jwt.sign({ phone, role: 'whatsapp_user' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, phone });
});

const userAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    if (decoded.role !== 'whatsapp_user') return res.status(403).json({ error: 'Invalid token' });
    req.phone = decoded.phone;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.get('/me/conversations', userAuth, async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.json([]);
  const phone = normalizePhone(req.phone);
  const { data } = await sb
    .from('messages')
    .select('id, direction, content, message_type, created_at')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(100);
  res.json(data || []);
});

router.get('/me/data', userAuth, async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.json([]);
  const phone = normalizePhone(req.phone);
  const { data } = await sb
    .from('collected_data')
    .select('*')
    .eq('phone', phone)
    .order('created_at', { ascending: false });
  res.json(data || []);
});

module.exports = router;
