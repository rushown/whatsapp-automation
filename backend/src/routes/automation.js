const express = require('express');
const cron = require('node-cron');
const { authenticate } = require('../middleware/auth');
const { automations, uuidv4 } = require('../store');

const router = express.Router();
const activeJobs = {}; // automationId -> cron job

// Get automations
router.get('/', authenticate, (req, res) => {
  res.json(automations[req.user.id] || []);
});

// Create automation
router.post('/', authenticate, (req, res) => {
  try {
    const { name, trigger, action, schedule, conditions, isActive = true } = req.body;
    if (!name || !trigger || !action) {
      return res.status(400).json({ error: 'Name, trigger and action are required' });
    }
    if (!automations[req.user.id]) automations[req.user.id] = [];
    const automation = {
      id: uuidv4(),
      name,
      trigger,
      action,
      schedule: schedule || null,
      conditions: conditions || [],
      isActive,
      userId: req.user.id,
      runCount: 0,
      lastRun: null,
      createdAt: new Date().toISOString()
    };
    automations[req.user.id].push(automation);

    // Schedule if cron
    if (trigger === 'scheduled' && schedule && isActive) {
      try {
        const job = cron.schedule(schedule, () => {
          automation.runCount += 1;
          automation.lastRun = new Date().toISOString();
          console.log(`Running automation: ${automation.name}`);
        });
        activeJobs[automation.id] = job;
      } catch (e) {
        console.error('Invalid cron schedule:', e.message);
      }
    }

    res.status(201).json(automation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update automation
router.put('/:id', authenticate, (req, res) => {
  const list = automations[req.user.id] || [];
  const idx = list.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Automation not found' });
  
  const updated = { ...list[idx], ...req.body, id: list[idx].id, userId: req.user.id };
  list[idx] = updated;

  // Handle job scheduling
  if (activeJobs[updated.id]) {
    activeJobs[updated.id].stop();
    delete activeJobs[updated.id];
  }
  if (updated.trigger === 'scheduled' && updated.schedule && updated.isActive) {
    try {
      const job = cron.schedule(updated.schedule, () => {
        updated.runCount += 1;
        updated.lastRun = new Date().toISOString();
      });
      activeJobs[updated.id] = job;
    } catch (e) {}
  }

  res.json(updated);
});

// Toggle automation
router.patch('/:id/toggle', authenticate, (req, res) => {
  const list = automations[req.user.id] || [];
  const automation = list.find(a => a.id === req.params.id);
  if (!automation) return res.status(404).json({ error: 'Automation not found' });
  automation.isActive = !automation.isActive;
  
  if (!automation.isActive && activeJobs[automation.id]) {
    activeJobs[automation.id].stop();
    delete activeJobs[automation.id];
  } else if (automation.isActive && automation.trigger === 'scheduled' && automation.schedule) {
    try {
      const job = cron.schedule(automation.schedule, () => {
        automation.runCount += 1;
        automation.lastRun = new Date().toISOString();
      });
      activeJobs[automation.id] = job;
    } catch (e) {}
  }

  res.json(automation);
});

// Delete automation
router.delete('/:id', authenticate, (req, res) => {
  if (!automations[req.user.id]) return res.status(404).json({ error: 'Not found' });
  if (activeJobs[req.params.id]) {
    activeJobs[req.params.id].stop();
    delete activeJobs[req.params.id];
  }
  automations[req.user.id] = automations[req.user.id].filter(a => a.id !== req.params.id);
  res.json({ success: true });
});

// Run automation manually
router.post('/:id/run', authenticate, (req, res) => {
  const list = automations[req.user.id] || [];
  const automation = list.find(a => a.id === req.params.id);
  if (!automation) return res.status(404).json({ error: 'Automation not found' });
  automation.runCount += 1;
  automation.lastRun = new Date().toISOString();
  res.json({ success: true, message: 'Automation triggered', automation });
});

module.exports = router;