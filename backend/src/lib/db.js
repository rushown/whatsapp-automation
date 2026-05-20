const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://ocean:ocean123@localhost:5432/whatsapp_bot',
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_keys (
      user_id            TEXT PRIMARY KEY,
      whatsapp_token     TEXT,
      phone_number_id    TEXT,
      business_account_id TEXT,
      groq_api_key       TEXT,
      deepseek_api_key   TEXT,
      openai_api_key     TEXT,
      elevenlabs_api_key TEXT,
      webhook_verify_token TEXT,
      updated_at         TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('[db] PostgreSQL ready — api_keys table OK');
}

async function getKeys(userId) {
  const { rows } = await pool.query('SELECT * FROM api_keys WHERE user_id = $1', [userId]);
  if (!rows.length) return {};
  const r = rows[0];
  return {
    whatsappToken:      r.whatsapp_token,
    phoneNumberId:      r.phone_number_id,
    businessAccountId:  r.business_account_id,
    groqApiKey:         r.groq_api_key,
    deepseekApiKey:     r.deepseek_api_key,
    openaiApiKey:       r.openai_api_key,
    elevenLabsApiKey:   r.elevenlabs_api_key,
    webhookVerifyToken: r.webhook_verify_token,
  };
}

async function saveKeys(userId, keys) {
  await pool.query(
    `INSERT INTO api_keys (
       user_id, whatsapp_token, phone_number_id, business_account_id,
       groq_api_key, deepseek_api_key, openai_api_key, elevenlabs_api_key,
       webhook_verify_token, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       whatsapp_token       = EXCLUDED.whatsapp_token,
       phone_number_id      = EXCLUDED.phone_number_id,
       business_account_id  = EXCLUDED.business_account_id,
       groq_api_key         = EXCLUDED.groq_api_key,
       deepseek_api_key     = EXCLUDED.deepseek_api_key,
       openai_api_key       = EXCLUDED.openai_api_key,
       elevenlabs_api_key   = EXCLUDED.elevenlabs_api_key,
       webhook_verify_token = EXCLUDED.webhook_verify_token,
       updated_at           = NOW()`,
    [
      userId,
      keys.whatsappToken      || null,
      keys.phoneNumberId      || null,
      keys.businessAccountId  || null,
      keys.groqApiKey         || null,
      keys.deepseekApiKey     || null,
      keys.openaiApiKey       || null,
      keys.elevenLabsApiKey   || null,
      keys.webhookVerifyToken || null,
    ]
  );
}

async function deleteKey(userId, keyName) {
  const colMap = {
    whatsappToken:      'whatsapp_token',
    phoneNumberId:      'phone_number_id',
    businessAccountId:  'business_account_id',
    groqApiKey:         'groq_api_key',
    deepseekApiKey:     'deepseek_api_key',
    openaiApiKey:       'openai_api_key',
    elevenLabsApiKey:   'elevenlabs_api_key',
    webhookVerifyToken: 'webhook_verify_token',
  };
  const col = colMap[keyName];
  if (!col) return;
  await pool.query(`UPDATE api_keys SET ${col} = NULL, updated_at = NOW() WHERE user_id = $1`, [userId]);
}

module.exports = { pool, initDb, getKeys, saveKeys, deleteKey };
