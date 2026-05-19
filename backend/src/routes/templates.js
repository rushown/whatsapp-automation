const express = require('express');
const { authenticate } = require('../middleware/auth');
const { templates, uuidv4 } = require('../store');

const router = express.Router();

// Get templates
router.get('/', authenticate, (req, res) => {
  res.json(templates[req.user.id] || []);
});

// Create template
router.post('/', authenticate, (req, res) => {
  const { name, category, language, content, variables = [], headerText, footerText, buttons = [] } = req.body;
  if (!name || !content) return res.status(400).json({ error: 'Name and content are required' });
  if (!templates[req.user.id]) templates[req.user.id] = [];
  const template = {
    id: uuidv4(),
    name,
    category: category || 'UTILITY',
    language: language || 'en_US',
    content,
    variables,
    headerText: headerText || '',
    footerText: footerText || '',
    buttons,
    status: 'local',
    createdAt: new Date().toISOString(),
    usageCount: 0
  };
  templates[req.user.id].push(template);
  res.status(201).json(template);
});

// Update template
router.put('/:id', authenticate, (req, res) => {
  const list = templates[req.user.id] || [];
  const idx = list.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Template not found' });
  list[idx] = { ...list[idx], ...req.body, id: list[idx].id };
  res.json(list[idx]);
});

// Delete template
router.delete('/:id', authenticate, (req, res) => {
  if (!templates[req.user.id]) return res.status(404).json({ error: 'Not found' });
  templates[req.user.id] = templates[req.user.id].filter(t => t.id !== req.params.id);
  res.json({ success: true });
});

// Increment usage
router.post('/:id/use', authenticate, (req, res) => {
  const list = templates[req.user.id] || [];
  const template = list.find(t => t.id === req.params.id);
  if (template) template.usageCount = (template.usageCount || 0) + 1;
  res.json({ success: true });
});

module.exports = router;