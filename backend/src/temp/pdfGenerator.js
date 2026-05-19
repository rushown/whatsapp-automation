/**
 * pdfGenerator.js
 * Reads an HTML template, fills {{placeholders}} with collected data,
 * then renders to PDF via Puppeteer.
 *
 * Install: npm install puppeteer
 * Remove:  npm uninstall pdfkit
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TEMPLATES_DIR = path.join(__dirname, 'templates');

/**
 * Map document type → template filename
 */
const TEMPLATE_MAP = {
  cv:                'cv.html',
  cover_letter:      'cover_letter.html',
  citizenship:       'citizenship.html',
  application_letter:'application_letter.html',
  certificate:       'certificate.html',
  generic:           'generic.html',
};

/**
 * Auto-generated values always available in every template
 */
function autoFields() {
  return {
    generated_date: new Date().toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    }),
    generated_time: new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kathmandu',
    }),
    ref_number: `REF-${Date.now().toString(36).toUpperCase()}`,
    generated_year: new Date().getFullYear().toString(),
  };
}

/**
 * Fill every {{placeholder}} in the HTML string with data values.
 * Any placeholder with no matching data key is replaced with an em dash.
 */
function fillTemplate(html, data) {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = data[key];
    if (val === null || val === undefined || val === '') return '—';
    return String(val);
  });
}

/**
 * Load and fill a template.
 * Falls back to generic.html if the specific template doesn't exist yet.
 */
function loadTemplate(documentType, data) {
  const filename = TEMPLATE_MAP[documentType] || 'generic.html';
  let templatePath = path.join(TEMPLATES_DIR, filename);

  if (!fs.existsSync(templatePath)) {
    templatePath = path.join(TEMPLATES_DIR, 'generic.html');
  }

  if (!fs.existsSync(templatePath)) {
    throw new Error(`No template found for document type "${documentType}" and no generic.html fallback.`);
  }

  const raw = fs.readFileSync(templatePath, 'utf8');
  return fillTemplate(raw, { ...autoFields(), ...data });
}

/**
 * Generate a PDF buffer from a document type and collected data.
 *
 * @param {string} documentType - matches a key in TEMPLATE_MAP
 * @param {Object} data         - field values collected from the user
 * @param {Object} flowMeta     - flow name, language, etc. (merged into data)
 * @returns {Promise<Buffer>}
 */
async function generatePDF(documentType, data, flowMeta = {}) {
  const mergedData = {
    ...data,
    flow_name:   flowMeta.name   || '',
    flow_name_np: flowMeta.nameNp || '',
  };

  const html = loadTemplate(documentType, mergedData);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

/**
 * Save a PDF buffer to a temp file. Returns the file path.
 * Used before uploading via Meta API.
 */
async function savePDFToTemp(buffer, filename) {
  const tmpDir = path.join(__dirname, '..', 'temp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const filePath = path.join(tmpDir, filename || `doc-${Date.now()}.pdf`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

/**
 * List all available template types (for the admin UI dropdown).
 */
function getAvailableTemplates() {
  return Object.keys(TEMPLATE_MAP).filter(type => {
    const filename = TEMPLATE_MAP[type];
    return fs.existsSync(path.join(TEMPLATES_DIR, filename));
  });
}

module.exports = { generatePDF, savePDFToTemp, getAvailableTemplates };