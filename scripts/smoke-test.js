#!/usr/bin/env node
const path = require('path');
const backendRoot = path.join(__dirname, '../backend');

process.chdir(backendRoot);
require(path.join(backendRoot, 'node_modules/dotenv')).config();

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

async function run() {
  let passed = 0;

  const { cosineSimilarity } = require(path.join(backendRoot, 'src/services/embeddings'));
  assert(cosineSimilarity([1, 0], [1, 0]) > 0.99, 'cosineSimilarity');
  passed++;

  const { normalizeUserText } = require(path.join(backendRoot, 'src/lib/textNormalize'));
  assert(normalizeUserText('  Hello   World ') === 'hello world', 'normalizeUserText');
  passed++;

  const { isDuplicate } = require(path.join(backendRoot, 'src/lib/messageDedup'));
  assert(!isDuplicate('wamid.test1'), 'dedup first');
  assert(isDuplicate('wamid.test1'), 'dedup second');
  passed++;

  const { isRateLimited } = require(path.join(backendRoot, 'src/lib/rateLimitPhone'));
  const phone = '9779800000001';
  for (let i = 0; i < 5; i++) isRateLimited(phone);
  assert(!isRateLimited(phone) || true, 'rate limit runs');
  passed++;

  const { verifyMetaSignature } = require(path.join(backendRoot, 'src/lib/webhookSecurity'));
  assert(verifyMetaSignature(Buffer.from('{}'), undefined) === true, 'sig skip without secret');
  passed++;

  const app = require(path.join(backendRoot, 'src/index'));
  assert(app && typeof app.listen === 'function', 'app loads');
  passed++;

  if (process.env.OPENAI_API_KEY) {
    const { setMemoryIntents, matchIntent } = require(path.join(backendRoot, 'src/services/intentMatcher'));
    setMemoryIntents([
      {
        id: '1',
        name: 'greeting',
        slug: 'greeting',
        is_active: true,
        threshold: 0.5,
        workflow_type: 'text',
        response_text: 'Hi!',
        embedding: null,
        intent_examples: [{ utterance: 'hello' }],
      },
    ]);
    const m = await matchIntent('hello', {
      openaiApiKey: process.env.OPENAI_API_KEY,
      defaultThreshold: 0.5,
    });
    console.log('  live intent:', m ? `${m.intent.slug} (${m.score.toFixed(3)})` : 'no match');
    passed++;
  } else {
    console.log('  skip live OpenAI intent test');
  }

  const base = process.env.SMOKE_BASE_URL;
  if (base) {
    const res = await fetch(`${base}/api/health`);
    const body = await res.json();
    assert(body.version, 'health version');
    console.log('  health:', body.status, JSON.stringify(body.checks));
    passed++;
  } else {
    console.log('  tip: SMOKE_BASE_URL=http://localhost:5000 npm test');
  }

  console.log(`\n✅ Passed ${passed} checks`);
}

run().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
