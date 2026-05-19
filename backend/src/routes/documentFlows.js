/**
 * routes/documentFlows.js
 * REST API for:
 *   - CRUD on document flow configurations (admin)
 *   - Manual PDF generation (POST /document-flows/generate)
 *   - Session inspection (admin)
 *   - Webhook integration hook (called by whatsapp.js route)
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const store = require('../documentFlowStore');
const { generatePDF } = require('../pdfGenerator');
const { handleIncomingMessage } = require('../documentFlowEngine');

// ── Admin: List all flows ─────────────────────────────────────────────────────
router.get('/', auth, (req, res) => {
  res.json({ flows: store.getAllFlows() });
});

// ── Admin: Get single flow ────────────────────────────────────────────────────
router.get('/:id', auth, (req, res) => {
  const flow = store.getFlow(req.params.id);
  if (!flow) return res.status(404).json({ error: 'Flow not found' });
  res.json({ flow });
});

// ── Admin: Create new flow ────────────────────────────────────────────────────
router.post('/', auth, (req, res) => {
  const { name, nameNp, documentType, language, active, triggerKeywords, questions, confirmationMessageEn, confirmationMessageNp } = req.body;

  if (!name || !documentType || !questions?.length) {
    return res.status(400).json({ error: 'name, documentType, and questions are required' });
  }

  const flow = store.createFlow({
    name, nameNp, documentType,
    language: language || 'bilingual',
    active: active !== undefined ? active : true,
    triggerKeywords: triggerKeywords || [],
    questions,
    confirmationMessageEn,
    confirmationMessageNp,
  });

  res.status(201).json({ flow });
});

// ── Admin: Update flow ────────────────────────────────────────────────────────
router.put('/:id', auth, (req, res) => {
  const flow = store.updateFlow(req.params.id, req.body);
  if (!flow) return res.status(404).json({ error: 'Flow not found' });
  res.json({ flow });
});

// ── Admin: Delete flow ────────────────────────────────────────────────────────
router.delete('/:id', auth, (req, res) => {
  const deleted = store.deleteFlow(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Flow not found' });
  res.json({ success: true });
});

// ── Admin: List active sessions ───────────────────────────────────────────────
router.get('/sessions/active', auth, (req, res) => {
  res.json({ sessions: store.getAllSessions() });
});

// ── Public: Generate document from collected data ─────────────────────────────
// Called by the flow engine internally or can be called externally.
// POST /document-flows/generate
// Body: { flowId, data: { field: value, ... } }
router.post('/generate', auth, async (req, res) => {
  const { flowId, data } = req.body;

  if (!flowId || !data) {
    return res.status(400).json({ error: 'flowId and data are required' });
  }

  const flow = store.getFlow(flowId);
  if (!flow) return res.status(404).json({ error: 'Flow not found' });

  try {
    const pdfBuffer = await generatePDF(flow.documentType, data, flow);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${flow.documentType}-${Date.now()}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[DocumentFlows] Generate error:', err);
    res.status(500).json({ error: 'PDF generation failed', details: err.message });
  }
});

// ── Internal hook: process incoming WhatsApp message through flow engine ───────
// Called by your existing whatsapp.js webhook handler
// POST /document-flows/webhook-hook
// Body: { phoneNumber, messageText }
router.post('/webhook-hook', async (req, res) => {
  const { phoneNumber, messageText } = req.body;
  if (!phoneNumber || !messageText) {
    return res.status(400).json({ error: 'phoneNumber and messageText required' });
  }

  // Get API keys from your existing store
  let groqApiKey, metaToken, phoneNumberId;
  try {
    // Adjust this to match how your existing code stores API keys
    const globalStore = require('../store');
    const keys = globalStore.apiKeys || {};
    groqApiKey = keys.groq;
    metaToken = keys.meta?.token;
    phoneNumberId = keys.meta?.phoneNumberId;
  } catch (e) {
    // Fallback to env
    groqApiKey = process.env.GROQ_API_KEY;
    metaToken = process.env.META_ACCESS_TOKEN;
    phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  }

  if (!groqApiKey || !metaToken || !phoneNumberId) {
    return res.status(503).json({ error: 'API keys not configured' });
  }

  try {
    const result = await handleIncomingMessage(phoneNumber, messageText, groqApiKey, metaToken, phoneNumberId);
    res.json(result);
  } catch (err) {
    console.error('[DocumentFlows] webhook-hook error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
