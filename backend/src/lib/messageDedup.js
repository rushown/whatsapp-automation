/** In-memory dedup for webhook retries (Meta may resend). TTL 24h. */
const seen = new Map();
const TTL_MS = 24 * 60 * 60 * 1000;

function prune() {
  const now = Date.now();
  for (const [id, ts] of seen) {
    if (now - ts > TTL_MS) seen.delete(id);
  }
}

function isDuplicate(messageId) {
  if (!messageId) return false;
  prune();
  if (seen.has(messageId)) return true;
  seen.set(messageId, Date.now());
  return false;
}

module.exports = { isDuplicate };
