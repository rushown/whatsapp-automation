const jwt = require('jsonwebtoken');
const { config } = require('../config');

const DEFAULT_SECRET = 'whatsapp-automation-super-secret-key-2024';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_SECRET;

if (config.nodeEnv === 'production' && (!process.env.JWT_SECRET || JWT_SECRET === DEFAULT_SECRET)) {
  console.error('[FATAL] Set a strong JWT_SECRET in production');
  process.exit(1);
}

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { authenticate, JWT_SECRET };
