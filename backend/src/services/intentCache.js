const { loadActiveIntents } = require('./intentRepository');
const logger = require('../lib/logger');

let cache = { intents: [], loadedAt: 0 };
const TTL_MS = parseInt(process.env.INTENT_CACHE_TTL_MS || '60000', 10);

async function getCachedIntents(force = false) {
  const now = Date.now();
  if (!force && cache.intents.length && now - cache.loadedAt < TTL_MS) {
    return cache.intents;
  }
  try {
    const intents = await loadActiveIntents();
    cache = { intents, loadedAt: now };
    return intents;
  } catch (err) {
    logger.error('Intent cache refresh failed', { error: err.message });
    return cache.intents;
  }
}

function invalidateIntentCache() {
  cache.loadedAt = 0;
}

module.exports = { getCachedIntents, invalidateIntentCache };
