const axios = require('axios');
const { config } = require('../config');
const logger = require('../lib/logger');

/**
 * Create embedding vector via OpenAI API.
 * @param {string} text
 * @param {string} [apiKey]
 * @returns {Promise<number[]>}
 */
async function createEmbedding(text, apiKey = config.openai.apiKey) {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY required for intent embeddings');
  }
  const model = config.openai.embeddingModel;
  const res = await axios.post(
    'https://api.openai.com/v1/embeddings',
    { model, input: text.trim() },
    {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 30000,
    }
  );
  return res.data.data[0].embedding;
}

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Average multiple embedding vectors.
 */
function averageEmbeddings(vectors) {
  if (!vectors.length) return null;
  const dim = vectors[0].length;
  const sum = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) sum[i] += v[i];
  }
  return sum.map((x) => x / vectors.length);
}

/**
 * Build composite embedding from intent name + examples.
 */
async function buildIntentEmbedding(intent, examples, apiKey) {
  const texts = [
    intent.name,
    intent.description || '',
    ...examples.map((e) => (typeof e === 'string' ? e : e.utterance)),
  ].filter(Boolean);

  const vectors = [];
  for (const t of texts) {
    try {
      vectors.push(await createEmbedding(t, apiKey));
    } catch (err) {
      logger.warn('Embedding failed for text snippet', { error: err.message });
    }
  }
  return averageEmbeddings(vectors);
}

module.exports = { createEmbedding, cosineSimilarity, averageEmbeddings, buildIntentEmbedding };
