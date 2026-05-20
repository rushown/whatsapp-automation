const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { users, uuidv4 } = require('../store');
const { authenticate, JWT_SECRET } = require('../middleware/auth');
const { getSupabase } = require('../lib/supabase');

const router = express.Router();

async function findUserByEmail(email) {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb
      .from('profiles')
      .select('id, name, email, password_hash, role, blocked, created_at')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    if (data) {
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        password: data.password_hash,
        role: data.role,
        blocked: data.blocked,
        createdAt: data.created_at,
      };
    }
  }
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.blocked) return res.status(403).json({ error: 'Account blocked' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const sb = getSupabase();

    if (sb) {
      const { data, error } = await sb
        .from('profiles')
        .insert({ name, email: email.toLowerCase(), password_hash: hashed, role: 'user' })
        .select()
        .single();
      if (error) return res.status(400).json({ error: error.message });
      const token = jwt.sign(
        { id: data.id, email: data.email, name: data.name, role: data.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.status(201).json({
        token,
        user: { id: data.id, name: data.name, email: data.email, role: data.role },
      });
    }

    const newUser = {
      id: uuidv4(),
      name,
      email,
      password: hashed,
      role: 'user',
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticate, async (req, res) => {
  const user = await findUserByEmail(req.user.email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt });
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const user = await findUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const sb = getSupabase();
    const updates = {};

    if (name) updates.name = name;
    if (currentPassword && newPassword) {
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
      updates.password_hash = await bcrypt.hash(newPassword, 10);
      user.password = updates.password_hash;
    }

    if (sb && Object.keys(updates).length) {
      await sb.from('profiles').update(updates).eq('id', user.id);
    } else if (!sb) {
      const mem = users.find((u) => u.id === user.id);
      if (mem && name) mem.name = name;
      if (mem && updates.password_hash) mem.password = updates.password_hash;
    }

    res.json({ id: user.id, name: name || user.name, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
