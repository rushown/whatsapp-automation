const express = require('express');
const { authenticate } = require('../middleware/auth');
const { contacts, uuidv4 } = require('../store');

const router = express.Router();

// Get contacts
router.get('/', authenticate, (req, res) => {
  const { search, tag } = req.query;
  let list = contacts[req.user.id] || [];
  if (search) list = list.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );
  if (tag) list = list.filter(c => c.tags && c.tags.includes(tag));
  res.json(list);
});

// Create contact
router.post('/', authenticate, (req, res) => {
  const { name, phone, email, tags = [], notes = '' } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });
  if (!contacts[req.user.id]) contacts[req.user.id] = [];
  if (contacts[req.user.id].find(c => c.phone === phone)) {
    return res.status(409).json({ error: 'Contact with this phone already exists' });
  }
  const contact = {
    id: uuidv4(),
    name,
    phone: phone.replace(/\s+/g, ''),
    email: email || '',
    tags,
    notes,
    messageCount: 0,
    lastMessage: null,
    createdAt: new Date().toISOString()
  };
  contacts[req.user.id].push(contact);
  res.status(201).json(contact);
});

// Bulk import contacts
router.post('/bulk', authenticate, (req, res) => {
  const { contactsList } = req.body;
  if (!Array.isArray(contactsList)) return res.status(400).json({ error: 'contactsList must be an array' });
  if (!contacts[req.user.id]) contacts[req.user.id] = [];
  const added = [];
  const skipped = [];
  contactsList.forEach(c => {
    if (!c.name || !c.phone) { skipped.push(c); return; }
    if (contacts[req.user.id].find(existing => existing.phone === c.phone)) { skipped.push(c); return; }
    const contact = { id: uuidv4(), ...c, phone: c.phone.replace(/\s+/g, ''), messageCount: 0, lastMessage: null, createdAt: new Date().toISOString() };
    contacts[req.user.id].push(contact);
    added.push(contact);
  });
  res.json({ added: added.length, skipped: skipped.length, contacts: added });
});

// Update contact
router.put('/:id', authenticate, (req, res) => {
  const list = contacts[req.user.id] || [];
  const idx = list.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Contact not found' });
  list[idx] = { ...list[idx], ...req.body, id: list[idx].id };
  res.json(list[idx]);
});

// Delete contact
router.delete('/:id', authenticate, (req, res) => {
  if (!contacts[req.user.id]) return res.status(404).json({ error: 'Not found' });
  contacts[req.user.id] = contacts[req.user.id].filter(c => c.id !== req.params.id);
  res.json({ success: true });
});

module.exports = router;