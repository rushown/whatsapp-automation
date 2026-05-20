require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { config, validateProductionConfig } = require('./config');
const { handleWebhookBody } = require('./services/webhookProcessor');
const { verifyMetaSignature } = require('./lib/webhookSecurity');
const logger = require('./lib/logger');
const { isSupabaseEnabled } = require('./lib/supabase');

const authRoutes = require('./routes/auth');
const apiKeyRoutes = require('./routes/apiKeys');
const whatsappRoutes = require('./routes/whatsapp');
const automationRoutes = require('./routes/automation');
const templateRoutes = require('./routes/templates');
const analyticsRoutes = require('./routes/analytics');
const contactRoutes = require('./routes/contacts');
const intentRoutes = require('./routes/intents');
const conversationRoutes = require('./routes/conversations');
const userRoutes = require('./routes/users');
const botConfigRoutes = require('./routes/botConfig');
const userPortalRoutes = require('./routes/userPortal');
const documentFlowRoutes = require('./routes/documentFlows');

const app = express();
app.locals.memoryIntents = [];

validateProductionConfig();
const { initDb } = require('./lib/db');
initDb().catch(err => console.error('[db] init failed:', err.message));

app.use(helmet({ contentSecurityPolicy: config.nodeEnv === 'production' }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use(
  cors({
    origin:
      config.frontendUrl === '*'
        ? true
        : [config.frontendUrl, 'http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.nodeEnv === 'production' ? 300 : 1000,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Capture raw body for Meta webhook signature (POST /webhook only)
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      if (req.originalUrl === '/webhook' && req.method === 'POST') {
        req.rawBody = buf;
      }
    },
  })
);
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/intents', intentRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bot-config', botConfigRoutes);
app.use('/api/portal', userPortalRoutes);
app.use('/api/document-flows', documentFlowRoutes);

app.get('/api/health', async (req, res) => {
  const checks = {
    supabase: isSupabaseEnabled(),
    meta: Boolean(config.meta.token && config.meta.phoneNumberId),
    openai: Boolean(config.openai.apiKey),
    groq: Boolean(config.groq.apiKey),
    deepseek: Boolean(config.deepseek.apiKey),
    elevenlabs: Boolean(config.elevenlabs.apiKey),
    webhookSecret: Boolean(process.env.META_APP_SECRET),
  };
  const botReady = checks.meta && checks.openai && (checks.groq || checks.deepseek);
  res.status(botReady ? 200 : 503).json({
    status: botReady ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    checks,
  });
});

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === config.webhookVerifyToken) {
    logger.info('Webhook verified');
    return res.status(200).send(challenge);
  }
  logger.warn('Webhook verification failed');
  res.sendStatus(403);
});

app.post('/webhook', (req, res) => {
  const signature = req.get('X-Hub-Signature-256');
  const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  if (!verifyMetaSignature(raw, signature)) {
    logger.warn('Invalid webhook signature');
    return res.sendStatus(403);
  }

  res.sendStatus(200);

  const body = req.body;
  if (!body || body.object !== 'whatsapp_business_account') return;

  setImmediate(() => {
    handleWebhookBody(body).catch((err) => {
      logger.error('Webhook processing error', { error: err.message });
    });
  });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
});

const PORT = config.port;
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`WhatsApp Bot Server running on port ${PORT}`, {
      env: config.nodeEnv,
      supabase: isSupabaseEnabled(),
    });
  });
}

module.exports = app;
