const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { config } = require('../config');
const logger = require('../lib/logger');

const TEMP_DIR = path.join(os.tmpdir(), 'wa-bot-audio');

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Generate speech MP3 via ElevenLabs.
 * @returns {Promise<string>} file path
 */
async function synthesizeSpeech(text, options = {}) {
  const apiKey = options.apiKey || config.elevenlabs.apiKey;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not configured');

  ensureTempDir();
  const voiceId = options.voiceId || config.elevenlabs.voiceId;
  const stability = options.stability ?? config.elevenlabs.stability;
  const similarityBoost = options.similarityBoost ?? config.elevenlabs.similarityBoost;

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const res = await axios.post(
    url,
    {
      text: text.slice(0, 5000),
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability, similarity_boost: similarityBoost },
    },
    {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      responseType: 'arraybuffer',
      timeout: 120000,
    }
  );

  const filePath = path.join(TEMP_DIR, `voice-${Date.now()}.mp3`);
  fs.writeFileSync(filePath, Buffer.from(res.data));
  return filePath;
}

function cleanupAudioFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    logger.warn('Failed to cleanup audio', { filePath, error: err.message });
  }
}

module.exports = { synthesizeSpeech, cleanupAudioFile, TEMP_DIR };
