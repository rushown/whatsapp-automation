/**
 * groqParser.js
 * Uses Groq AI to:
 *  1. Parse user answers into structured field values
 *  2. Generate bilingual (NP/EN) bot messages
 *  3. Validate and sanitize collected data
 *
 * Install: npm install groq-sdk
 */

const Groq = require('groq-sdk');

let groqClient = null;

function getGroqClient(apiKey) {
  if (!groqClient || groqClient._apiKey !== apiKey) {
    groqClient = new Groq({ apiKey });
    groqClient._apiKey = apiKey;
  }
  return groqClient;
}

/**
 * Parse a user's WhatsApp message to extract the value for a specific field.
 *
 * @param {string}  userMessage   - Raw WhatsApp text from user
 * @param {Object}  question      - Current question object from the flow
 * @param {string}  apiKey        - Groq API key
 * @returns {Promise<{value: string|null, error: string|null, confidence: number}>}
 */
async function parseUserAnswer(userMessage, question, apiKey) {
  const groq = getGroqClient(apiKey);

  const systemPrompt = `You are a document processing assistant for a WhatsApp bot in Nepal.
Your job is to extract structured field values from user messages.
The user may respond in English or Nepali (Devanagari script or romanized).
You MUST return valid JSON only — no explanation, no markdown.

Field being collected: "${question.label}" (${question.labelNp})
Validation type: ${question.validationType}

Return exactly this JSON shape:
{
  "value": "extracted clean value or null if not found",
  "confidence": 0.0 to 1.0,
  "error": "human-readable error message if invalid/unclear, or null"
}

Rules:
- For "text" fields: return the cleaned, title-cased name or address
- For "date" fields: normalize to YYYY-MM-DD (AD). If BS date given, convert approximately.
- For "phone" fields: extract digits, format as 98XXXXXXXX or +977-98XXXXXXXX
- If the message seems like a greeting or off-topic, set value to null and error to a polite re-prompt
- Never hallucinate values; if unclear, set value to null`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `User message: "${userMessage}"` },
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[GroqParser] parseUserAnswer error:', err.message);
    return { value: null, confidence: 0, error: 'AI parsing unavailable, please try again.' };
  }
}

/**
 * Detect the language of a message (returns 'ne' for Nepali, 'en' for English).
 */
async function detectLanguage(message, apiKey) {
  const groq = getGroqClient(apiKey);
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'Detect if the message is in Nepali (including romanized) or English. Reply with exactly one word: "ne" or "en".',
        },
        { role: 'user', content: message },
      ],
      temperature: 0,
      max_tokens: 5,
    });
    const lang = completion.choices[0]?.message?.content?.trim().toLowerCase();
    return lang === 'ne' ? 'ne' : 'en';
  } catch {
    return 'en';
  }
}

/**
 * Generate the next question message in the user's preferred language.
 * Returns both EN and NP versions for bilingual delivery.
 */
function buildQuestionMessage(question, lang = 'both', stepNum, totalSteps) {
  const progress = `(${stepNum}/${totalSteps})`;
  if (lang === 'ne') {
    return `${progress} ${question.questionNp}`;
  }
  if (lang === 'en') {
    return `${progress} ${question.questionEn}`;
  }
  // Bilingual: show both
  return `${progress} ${question.questionEn}\n\n_${question.questionNp}_`;
}

/**
 * Generate an error/re-prompt message when user's answer couldn't be parsed.
 */
function buildErrorMessage(question, errorMsg, lang = 'both') {
  const enMsg = `❌ ${errorMsg || 'I could not understand that.'} Please answer: ${question.questionEn}`;
  const npMsg = `❌ ${question.questionNp} — कृपया फेरि उत्तर दिनुहोस्।`;
  if (lang === 'ne') return npMsg;
  if (lang === 'en') return enMsg;
  return `${enMsg}\n\n_${npMsg}_`;
}

/**
 * Generate a summary of collected data for user confirmation before PDF generation.
 */
function buildConfirmationMessage(collectedData, questions, lang = 'both') {
  const lines = questions.map(q => {
    const val = collectedData[q.field] || '—';
    return lang === 'ne' ? `• *${q.labelNp}:* ${val}` : `• *${q.label}:* ${val}`;
  });

  if (lang === 'ne') {
    return `✅ *तपाईंका विवरणहरू:*\n\n${lines.join('\n')}\n\nके यी विवरणहरू सही छन्? हो / छैन`;
  }
  if (lang === 'en') {
    return `✅ *Your details:*\n\n${lines.join('\n')}\n\nAre these details correct? yes / no`;
  }
  return `✅ *Your details / तपाईंका विवरणहरू:*\n\n${lines.join('\n')}\n\nAre these correct? yes / no\nके यी सही छन्? हो / छैन`;
}

/**
 * Check if a message is an affirmative (yes/hoi/hn) or negative (no/hoina).
 */
function isAffirmative(message) {
  const affirmative = /^(yes|y|hoi|ho|hn|हो|हुन्छ|okay|ok|sahi|sahi cha|right|correct)/i;
  return affirmative.test(message.trim());
}

function isNegative(message) {
  const negative = /^(no|n|hoina|hoena|होइन|गलत|wrong|incorrect|nai)/i;
  return negative.test(message.trim());
}

module.exports = {
  parseUserAnswer,
  detectLanguage,
  buildQuestionMessage,
  buildErrorMessage,
  buildConfirmationMessage,
  isAffirmative,
  isNegative,
};
