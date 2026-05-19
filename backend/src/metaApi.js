/**
 * metaApi.js
 * Thin wrapper around Meta WhatsApp Cloud API for sending messages and media.
 */

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const META_API_BASE = 'https://graph.facebook.com/v18.0';

/**
 * Send a plain text message via WhatsApp.
 */
async function sendTextMessage(to, text, accessToken, phoneNumberId) {
  const url = `${META_API_BASE}/${phoneNumberId}/messages`;
  const res = await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: text },
    },
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  );
  return res.data;
}

/**
 * Upload a media file to WhatsApp media endpoint.
 * Returns the media_id.
 */
async function uploadMedia(filePath, mimeType, accessToken, phoneNumberId) {
  const url = `${META_API_BASE}/${phoneNumberId}/media`;
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType);
  form.append('file', fs.createReadStream(filePath), {
    contentType: mimeType,
    filename: filePath.split('/').pop(),
  });

  const res = await axios.post(url, form, {
    headers: { Authorization: `Bearer ${accessToken}`, ...form.getHeaders() },
  });
  return res.data.id;
}

/**
 * Send a document (PDF, etc.) message by media_id.
 */
async function sendDocument(to, mediaId, caption, accessToken, phoneNumberId) {
  const url = `${META_API_BASE}/${phoneNumberId}/messages`;
  const res = await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'document',
      document: {
        id: mediaId,
        caption: caption || 'Your document',
        filename: caption || 'document.pdf',
      },
    },
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  );
  return res.data;
}

/**
 * Mark a message as read.
 */
async function markAsRead(messageId, accessToken, phoneNumberId) {
  const url = `${META_API_BASE}/${phoneNumberId}/messages`;
  const res = await axios.post(
    url,
    { messaging_product: 'whatsapp', status: 'read', message_id: messageId },
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  );
  return res.data;
}

module.exports = { sendTextMessage, uploadMedia, sendDocument, markAsRead };
