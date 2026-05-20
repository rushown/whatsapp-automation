const axios = require('axios');
const { config } = require('../config');
const logger = require('../lib/logger');

const HUMAN_SYSTEM_PROMPT = `You are a warm, professional WhatsApp assistant. Communicate like a real human:
- Use natural, conversational language (not robotic).
- Be concise — WhatsApp messages should be short.
- Match the user's tone when appropriate.
- Never invent facts or answer topics outside your given task.
- If you cannot help, stay silent (return empty) rather than guessing.`;

/**
 * Chat completion via Groq, DeepSeek, or OpenAI-compatible API.
 */
async function chatCompletion({
  messages,
  provider = 'groq',
  apiKey,
  maxTokens = 400,
  temperature = 0.4,
  systemPrompt,
}) {
  const system = systemPrompt || HUMAN_SYSTEM_PROMPT;
  const fullMessages = [{ role: 'system', content: system }, ...messages];

  if (provider === 'deepseek') {
    const key = apiKey || config.deepseek.apiKey;
    if (!key) throw new Error('DeepSeek API key not configured');
    const res = await axios.post(
      `${config.deepseek.baseUrl}/v1/chat/completions`,
      {
        model: config.deepseek.model,
        messages: fullMessages,
        max_tokens: maxTokens,
        temperature,
      },
      {
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        timeout: 60000,
      }
    );
    return res.data.choices[0]?.message?.content?.trim() || '';
  }

  if (provider === 'openai') {
    const key = apiKey || config.openai.apiKey;
    if (!key) throw new Error('OpenAI API key not configured');
    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: fullMessages,
        max_tokens: maxTokens,
        temperature,
      },
      {
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        timeout: 60000,
      }
    );
    return res.data.choices[0]?.message?.content?.trim() || '';
  }

  // Default: Groq
  const key = apiKey || config.groq.apiKey;
  if (!key) throw new Error('Groq API key not configured');
  const res = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: config.groq.model,
      messages: fullMessages,
      max_tokens: maxTokens,
      temperature,
    },
    {
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      timeout: 60000,
    }
  );
  return res.data.choices[0]?.message?.content?.trim() || '';
}

/**
 * Parse user answer for data collection field.
 */
async function parseFieldValue(userMessage, field, provider, apiKey) {
  const prompt = `Extract the value for field "${field.label}" (${field.key}).
Validation: ${field.validation || 'text'}
Return JSON only: {"value": "string or null", "valid": true/false, "error": "message or null"}`;

  try {
    const raw = await chatCompletion({
      messages: [{ role: 'user', content: userMessage }],
      provider,
      apiKey,
      maxTokens: 200,
      temperature: 0.1,
      systemPrompt: prompt,
    });
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    logger.error('parseFieldValue failed', { error: err.message });
    const trimmed = userMessage.trim();
    if (trimmed.length < 1) return { value: null, valid: false, error: 'Please provide an answer.' };
    return { value: trimmed, valid: true, error: null };
  }
}

/**
 * Personalize intent response text with optional AI polish.
 */
async function personalizeResponse(templateText, userMessage, provider, apiKey, systemPrompt) {
  if (!templateText) return '';
  const res = await chatCompletion({
    messages: [
      {
        role: 'user',
        content: `User said: "${userMessage}"\n\nDeliver this response naturally (keep the same facts, do not add new info):\n${templateText}`,
      },
    ],
    provider,
    apiKey,
    maxTokens: 350,
    temperature: 0.5,
    systemPrompt: systemPrompt || HUMAN_SYSTEM_PROMPT,
  });
  return res || templateText;
}

module.exports = {
  chatCompletion,
  parseFieldValue,
  personalizeResponse,
  HUMAN_SYSTEM_PROMPT,
};
