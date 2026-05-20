/**
 * Normalize user text for consistent intent matching.
 */
function normalizeUserText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

module.exports = { normalizeUserText };
