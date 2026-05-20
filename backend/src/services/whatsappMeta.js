const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const { config } = require('../config');
const logger = require('../lib/logger');

function apiBase(version) {
  const v = version || config.meta.apiVersion || 'v21.0';
  return `https://graph.facebook.com/${v}`;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function sendText(to, text, token, phoneNumberId) {
  const url = `${apiBase()}/${phoneNumberId}/messages`;
  const res = await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: text },
    },
    { headers: authHeaders(token) }
  );
  return res.data;
}

async function markAsRead(messageId, token, phoneNumberId) {
  const url = `${apiBase()}/${phoneNumberId}/messages`;
  await axios.post(
    url,
    { messaging_product: 'whatsapp', status: 'read', message_id: messageId },
    { headers: authHeaders(token) }
  );
}

async function uploadMedia(filePath, mimeType, token, phoneNumberId) {
  const url = `${apiBase()}/${phoneNumberId}/media`;
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType);
  form.append('file', fs.createReadStream(filePath), {
    contentType: mimeType,
    filename: filePath.split('/').pop(),
  });
  const res = await axios.post(url, form, {
    headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() },
    timeout: 120000,
  });
  return res.data.id;
}

async function sendAudio(to, mediaId, token, phoneNumberId) {
  const url = `${apiBase()}/${phoneNumberId}/messages`;
  const res = await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'audio',
      audio: { id: mediaId },
    },
    { headers: authHeaders(token) }
  );
  return res.data;
}

async function sendVoiceFromFile(to, filePath, token, phoneNumberId) {
  const mediaId = await uploadMedia(filePath, 'audio/mpeg', token, phoneNumberId);
  return sendAudio(to, mediaId, token, phoneNumberId);
}

async function retry(fn, attempts = 3, delayMs = 1000) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      logger.warn('WhatsApp API retry', { attempt: i + 1, error: err.message });
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

module.exports = {
  sendText,
  markAsRead,
  uploadMedia,
  sendAudio,
  sendVoiceFromFile,
  retry,
};
