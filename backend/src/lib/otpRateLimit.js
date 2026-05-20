const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = parseInt(process.env.OTP_MAX_REQUESTS_PER_15MIN || '5', 10);

function isOtpRateLimited(phone) {
  const key = String(phone).replace(/\D/g, '');
  const now = Date.now();
  let bucket = attempts.get(key);
  if (!bucket || now - bucket.start > WINDOW_MS) {
    bucket = { start: now, count: 0 };
    attempts.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count > MAX_REQUESTS;
}

module.exports = { isOtpRateLimited };
