// In-memory store (use MongoDB/PostgreSQL in production)
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// Seed test users
const users = [
  {
    id: uuidv4(),
    name: 'Admin User',
    email: 'admin@wauto.com',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    avatar: null,
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    name: 'Test User',
    email: 'test@wauto.com',
    password: bcrypt.hashSync('test123', 10),
    role: 'user',
    avatar: null,
    createdAt: new Date().toISOString()
  }
];

const apiKeys = {}; // userId -> { whatsappToken, phoneNumberId, businessAccountId, groqApiKey, ... }
const templates = {}; // userId -> []
const automations = {}; // userId -> []
const contacts = {}; // userId -> []
const messages = {}; // userId -> []
const analytics = {}; // userId -> {}

module.exports = { users, apiKeys, templates, automations, contacts, messages, analytics, uuidv4 };