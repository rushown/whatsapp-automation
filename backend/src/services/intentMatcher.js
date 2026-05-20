const { createEmbedding, cosineSimilarity } = require('./embeddings');
const { getCachedIntents } = require('./intentCache');
const { normalizeUserText } = require('../lib/textNormalize');
const { config } = require('../config');
const logger = require('../lib/logger');

const AMBIGUITY_MARGIN = parseFloat(process.env.INTENT_AMBIGUITY_MARGIN || '0.04');

function parseVector(stored) {
  if (!stored) return null;
  if (Array.isArray(stored)) return stored;
  if (typeof stored === 'string') {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return stored;
}

const { loadActiveIntents, setMemoryIntents: setMemory } = require('./intentRepository');

/**
 * Match user message to best intent. Returns null if below threshold or ambiguous (SILENCE).
 */
async function matchIntent(userMessage, options = {}) {
  const thresholdDefault = options.defaultThreshold ?? config.defaultIntentThreshold;
  const openaiKey = options.openaiApiKey || config.openai.apiKey;

  const normalized = normalizeUserText(userMessage);
  if (!normalized) return null;

  if (!openaiKey) {
    logger.error('OPENAI_API_KEY missing — cannot match intents');
    return null;
  }

  let queryEmbedding;
  try {
    queryEmbedding = await createEmbedding(userMessage.trim(), openaiKey);
  } catch (err) {
    logger.error('Failed to embed user message', { error: err.message });
    return null;
  }

  const intents = await getCachedIntents();
  const scores = [];

  for (const intent of intents) {
    const intentThreshold = intent.threshold ?? thresholdDefault;
    const candidates = [];

    const mainVec = parseVector(intent.embedding);
    if (mainVec) {
      candidates.push(cosineSimilarity(queryEmbedding, mainVec));
    }

    const examples = intent.intent_examples || intent.examples || [];
    for (const ex of examples) {
      const exVec = parseVector(ex.embedding);
      if (exVec) {
        candidates.push(cosineSimilarity(queryEmbedding, exVec));
      }
    }

    if (!candidates.length && examples.length) {
      const utterances = examples.map((e) => (typeof e === 'string' ? e : e.utterance)).filter(Boolean);
      const fuzzy = utterances.some((u) => normalizeUserText(u) === normalized);
      if (fuzzy) candidates.push(intentThreshold + 0.01);
    }

    const topScore = candidates.length ? Math.max(...candidates) : 0;
    if (topScore > 0) {
      scores.push({ intent, score: topScore, threshold: intentThreshold });
    }
  }

  if (!scores.length) {
    logger.info('No intent candidates', { text: normalized.slice(0, 60) });
    return null;
  }

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const second = scores[1];

  if (best.score < best.threshold) {
    logger.info('Below threshold — silence', { score: best.score, threshold: best.threshold });
    return null;
  }

  if (second && second.score >= second.threshold && best.score - second.score < AMBIGUITY_MARGIN) {
    logger.info('Ambiguous intent — silence', {
      top: best.intent.slug || best.intent.name,
      score: best.score,
      second: second.intent.slug || second.intent.name,
      secondScore: second.score,
    });
    return null;
  }

  return { intent: best.intent, score: best.score };
}

function setMemoryIntents(intents) {
  setMemory(intents);
  require('./intentCache').invalidateIntentCache();
}

module.exports = { matchIntent, loadActiveIntents, setMemoryIntents, parseVector };
