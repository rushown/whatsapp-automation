/** Per-phone rate limit to prevent abuse. Default: 30 msgs / minute. */
const buckets = new Map();
const WINDOW_MS = 60 * 1000;
const MAX = parseInt(process.env.PHONE_RATE_LIMIT_PER_MIN || '30', 10);

function isRateLimited(phone) {
  if (!phone) return false;
  const now = Date.now();
  let bucket = buckets.get(phone);
  if (!bucket || now - bucket.start > WINDOW_MS) {
    bucket = { start: now, count: 0 };
    buckets.set(phone, bucket);
  }
  bucket.count += 1;
  if (buckets.size > 10000) {
    for (const [k, v] of buckets) {
      if (now - v.start > WINDOW_MS) buckets.delete(k);
    }
  }
  return bucket.count > MAX;
}

module.exports = { isRateLimited };
