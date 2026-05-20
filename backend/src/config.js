require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,

  webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN,

  meta: {
    appSecret: process.env.META_APP_SECRET,
    token: process.env.META_WHATSAPP_TOKEN,
    phoneNumberId: process.env.META_PHONE_NUMBER_ID,
    businessAccountId: process.env.META_BUSINESS_ACCOUNT_ID,
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  },

  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  },

  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    voiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
    stability: parseFloat(process.env.ELEVENLABS_STABILITY || '0.5'),
    similarityBoost: parseFloat(process.env.ELEVENLABS_SIMILARITY_BOOST || '0.75'),
  },

  defaultIntentThreshold: parseFloat(process.env.DEFAULT_INTENT_THRESHOLD || '0.78'),
  useSupabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
};

function validateProductionConfig() {
  if (config.nodeEnv !== 'production') return;

  const required = ['JWT_SECRET', 'WEBHOOK_VERIFY_TOKEN', 'META_WHATSAPP_TOKEN', 'META_PHONE_NUMBER_ID', 'OPENAI_API_KEY'];
  const missing = required.filter((k) => {
    const map = {
      JWT_SECRET: config.jwtSecret,
      WEBHOOK_VERIFY_TOKEN: config.webhookVerifyToken,
      META_WHATSAPP_TOKEN: config.meta.token,
      META_PHONE_NUMBER_ID: config.meta.phoneNumberId,
      OPENAI_API_KEY: config.openai.apiKey,
    };
    return !map[k] || map[k] === 'change-me-in-production';
  });

  if (missing.length) {
    console.warn(`[config] Production missing or default: ${missing.join(', ')}`);
  }
  if (!config.meta.appSecret) {
    console.warn('[config] META_APP_SECRET not set — webhook signatures disabled');
  }
  if (!config.groq.apiKey && !config.deepseek.apiKey) {
    console.warn('[config] Set GROQ_API_KEY or DEEPSEEK_API_KEY for AI replies');
  }
}

module.exports = { config, validateProductionConfig };
