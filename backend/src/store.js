// In-memory fallback when Supabase is not configured
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const users = [
  {
    id: uuidv4(),
    name: 'Admin User',
    email: 'admin@example.com',
    password: bcrypt.hashSync('Admin@1234', 10),
    role: 'admin',
    avatar: null,
    createdAt: new Date().toISOString(),
  },
];

const apiKeys = {};
const templates = {};
const automations = {};
const contacts = {};
const messages = {};
const analytics = {};

module.exports = { users, apiKeys, templates, automations, contacts, messages, analytics, uuidv4 };
