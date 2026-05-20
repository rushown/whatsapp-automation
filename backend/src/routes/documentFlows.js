const express = require('express');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const store = require('../documentFlowStore');

const router = express.Router();
router.use(authenticate, adminOnly);

router.get('/', (req, res) => {
  res.json({ flows: store.getAllFlows() });
});

router.get('/:id', (req, res) => {
  const flow = store.getFlow(req.params.id);
  if (!flow) return res.status(404).json({ error: 'Flow not found' });
  res.json({ flow });
});

router.post('/', (req, res) => {
  const { name, documentType, questions, triggerKeywords } = req.body;
  if (!name || !questions?.length) {
    return res.status(400).json({ error: 'name and questions are required' });
  }
  const flow = store.createFlow({
    name,
    documentType: documentType || 'generic',
    questions,
    triggerKeywords: triggerKeywords || [],
    active: true,
  });
  res.status(201).json({ flow });
});

router.put('/:id', (req, res) => {
  const flow = store.updateFlow(req.params.id, req.body);
  if (!flow) return res.status(404).json({ error: 'Flow not found' });
  res.json({ flow });
});

router.delete('/:id', (req, res) => {
  if (!store.deleteFlow(req.params.id)) return res.status(404).json({ error: 'Flow not found' });
  res.json({ success: true });
});

module.exports = router;
