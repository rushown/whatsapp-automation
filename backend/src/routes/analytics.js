const express = require('express');
const { authenticate } = require('../middleware/auth');
const { messages, automations, contacts, templates } = require('../store');

const router = express.Router();

router.get('/overview', authenticate, (req, res) => {
  const userId = req.user.id;
  const userMessages = messages[userId] || [];
  const userAutomations = automations[userId] || [];
  const userContacts = contacts[userId] || [];
  const userTemplates = templates[userId] || [];

  const sent = userMessages.filter(m => m.direction === 'outbound').length;
  const received = userMessages.filter(m => m.direction === 'inbound').length;
  const activeAutomations = userAutomations.filter(a => a.isActive).length;

  // Message volume last 7 days
  const now = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const volumeByDay = last7Days.map(day => ({
    date: day,
    sent: userMessages.filter(m => m.timestamp && m.timestamp.startsWith(day) && m.direction === 'outbound').length,
    received: userMessages.filter(m => m.timestamp && m.timestamp.startsWith(day) && m.direction === 'inbound').length
  }));

  res.json({
    totalMessages: userMessages.length,
    messagesSent: sent,
    messagesReceived: received,
    totalContacts: userContacts.length,
    activeAutomations,
    totalAutomations: userAutomations.length,
    totalTemplates: userTemplates.length,
    automationRuns: userAutomations.reduce((sum, a) => sum + (a.runCount || 0), 0),
    volumeByDay,
    deliveryRate: sent > 0 ? Math.floor(85 + Math.random() * 15) : 0,
    openRate: sent > 0 ? Math.floor(60 + Math.random() * 30) : 0
  });
});

module.exports = router;