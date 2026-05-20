const crypto = require('crypto');
const { config } = require('../config');
const logger = require('./logger');

/**
 * Verify Meta X-Hub-Signature-256.
 * Production: META_APP_SECRET required.
 * Development: skipped only if META_APP_SECRET unset.
 */
function verifyMetaSignature(rawBody, signatureHeader) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) {
    if (config.nodeEnv === 'production') {
      logger.error('META_APP_SECRET required in production');
      return false;
    }
    return true;
  }
  if (!signatureHeader || !rawBody) return false;

  const expected =
    'sha256=' +
    crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  try {
    const sigBuf = Buffer.from(signatureHeader, 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

module.exports = { verifyMetaSignature };
