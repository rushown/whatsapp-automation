/**
 * pdfGenerator.js
 * Generates professional PDF documents from collected form data.
 * Uses PDFKit (pure Node.js, no headless browser needed).
 *
 * Install: npm install pdfkit
 */

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Generates a PDF for the given document type and collected data.
 * Returns a Buffer containing the PDF bytes.
 *
 * @param {string} documentType  - e.g. 'citizenship', 'application_letter', 'certificate'
 * @param {Object} data          - key/value pairs collected from the user
 * @param {Object} flowMeta      - flow name, language, etc.
 * @returns {Promise<Buffer>}
 */
async function generatePDF(documentType, data, flowMeta = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 72, right: 72 },
      info: {
        Title: flowMeta.name || 'Document',
        Author: 'WhatsApp Automation Platform',
        Subject: documentType,
        Creator: 'WA DocBot',
      },
    });

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    switch (documentType) {
      case 'citizenship':
        renderCitizenshipForm(doc, data, flowMeta);
        break;
      case 'application_letter':
        renderApplicationLetter(doc, data, flowMeta);
        break;
      case 'certificate':
        renderCertificate(doc, data, flowMeta);
        break;
      default:
        renderGenericDocument(doc, data, flowMeta);
    }

    doc.end();
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderHeader(doc, title, subtitle) {
  // Government-style header band
  doc.rect(0, 0, doc.page.width, 8).fill('#C41E3A');
  doc.rect(0, 8, doc.page.width, 4).fill('#003893');

  doc.moveDown(1);

  doc.fontSize(18).font('Helvetica-Bold').fillColor('#003893').text(title, { align: 'center' });
  if (subtitle) {
    doc.fontSize(11).font('Helvetica').fillColor('#555').text(subtitle, { align: 'center' });
  }

  // Divider
  doc.moveDown(0.5);
  doc.moveTo(72, doc.y).lineTo(doc.page.width - 72, doc.y).strokeColor('#C41E3A').lineWidth(1.5).stroke();
  doc.moveDown(1);
}

function renderField(doc, label, value, isLast = false) {
  const startY = doc.y;
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#444').text(label.toUpperCase(), { continued: false });
  doc
    .fontSize(11)
    .font('Helvetica')
    .fillColor('#111')
    .text(value || '—', { indent: 8 });

  if (!isLast) {
    doc.moveDown(0.3);
    doc
      .moveTo(72, doc.y)
      .lineTo(doc.page.width - 72, doc.y)
      .strokeColor('#ddd')
      .lineWidth(0.5)
      .stroke();
    doc.moveDown(0.5);
  }
}

function renderFooter(doc) {
  const bottom = doc.page.height - 50;
  doc
    .fontSize(8)
    .font('Helvetica')
    .fillColor('#999')
    .text(
      `Generated on ${new Date().toLocaleString('ne-NP', { timeZone: 'Asia/Kathmandu' })} • WhatsApp Document Bot`,
      72,
      bottom,
      { align: 'center', width: doc.page.width - 144 }
    );
  doc.rect(0, doc.page.height - 8, doc.page.width, 8).fill('#003893');
}

// ── Document Types ────────────────────────────────────────────────────────────

function renderCitizenshipForm(doc, data, flowMeta) {
  renderHeader(doc, 'CITIZENSHIP APPLICATION FORM', 'नागरिकता आवेदन फारम | Government of Nepal');

  // Application ref
  const ref = `REF-${Date.now().toString(36).toUpperCase()}`;
  doc.fontSize(9).fillColor('#888').text(`Application Reference: ${ref}`, { align: 'right' });
  doc.moveDown(1);

  doc.fontSize(13).font('Helvetica-Bold').fillColor('#003893').text('PERSONAL INFORMATION / व्यक्तिगत विवरण');
  doc.moveDown(0.5);

  const fields = [
    { label: 'Full Name / पूरा नाम', key: 'full_name' },
    { label: 'Date of Birth / जन्म मिति', key: 'date_of_birth' },
    { label: "Father's Name / बुबाको नाम", key: 'father_name' },
    { label: "Mother's Name / आमाको नाम", key: 'mother_name' },
    { label: 'Permanent Address / स्थायी ठेगाना', key: 'permanent_address' },
    { label: 'Phone Number / फोन नम्बर', key: 'phone_number' },
  ];

  fields.forEach((f, i) => renderField(doc, f.label, data[f.key], i === fields.length - 1));

  doc.moveDown(2);
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#003893').text('DECLARATION / घोषणापत्र');
  doc.moveDown(0.5);
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#333')
    .text(
      'I hereby declare that the information provided above is true and correct to the best of my knowledge and belief.\n\nमैले यसमा उल्लेख गरेका सबै विवरणहरू सत्य र सही छन् भनी घोषणा गर्दछु।',
      { lineGap: 4 }
    );

  doc.moveDown(3);

  // Signature lines
  const sigY = doc.y;
  const leftX = 72;
  const rightX = doc.page.width - 200;

  doc.moveTo(leftX, sigY).lineTo(leftX + 130, sigY).strokeColor('#333').lineWidth(1).stroke();
  doc.fontSize(9).fillColor('#555').text('Applicant Signature / आवेदकको दस्तखत', leftX, sigY + 4);

  doc.moveTo(rightX, sigY).lineTo(rightX + 130, sigY).strokeColor('#333').lineWidth(1).stroke();
  doc.fontSize(9).fillColor('#555').text('Date / मिति', rightX, sigY + 4);

  renderFooter(doc);
}

function renderApplicationLetter(doc, data, flowMeta) {
  renderHeader(doc, 'APPLICATION LETTER', 'निवेदन पत्र');

  const today = new Date().toLocaleDateString('en-NP', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.fontSize(11).font('Helvetica').fillColor('#333').text(`Date: ${today}`, { align: 'right' });
  doc.moveDown(1);

  doc.fontSize(11).text(`To,\n${data.recipient || 'The Concerned Authority'},\n${data.office || ''}`);
  doc.moveDown(1);
  doc.text(`Subject: ${data.subject || 'Application'}`);
  doc.moveDown(1);
  doc.text('Respected Sir/Madam,');
  doc.moveDown(0.5);
  doc.text(
    data.body ||
      `I, ${data.full_name || 'the undersigned'}, would like to respectfully apply for the above-mentioned subject. All necessary information has been provided herein.`,
    { lineGap: 4 }
  );
  doc.moveDown(2);
  doc.text('Yours faithfully,');
  doc.moveDown(2);
  doc.text(`Name: ${data.full_name || ''}`);
  doc.text(`Phone: ${data.phone_number || ''}`);
  doc.text(`Address: ${data.permanent_address || ''}`);

  renderFooter(doc);
}

function renderCertificate(doc, data, flowMeta) {
  renderHeader(doc, 'CERTIFICATE OF COMPLETION', 'प्रमाणपत्र');

  doc.moveDown(2);
  doc
    .fontSize(14)
    .font('Helvetica')
    .fillColor('#333')
    .text('This is to certify that', { align: 'center' });
  doc.moveDown(1);
  doc
    .fontSize(22)
    .font('Helvetica-Bold')
    .fillColor('#003893')
    .text(data.full_name || 'Recipient Name', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(12).font('Helvetica').fillColor('#333').text(data.description || '', { align: 'center', lineGap: 4 });

  renderFooter(doc);
}

function renderGenericDocument(doc, data, flowMeta) {
  renderHeader(doc, flowMeta.name || 'DOCUMENT', flowMeta.nameNp || '');

  doc.moveDown(1);
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#003893').text('COLLECTED INFORMATION');
  doc.moveDown(0.5);

  const entries = Object.entries(data);
  entries.forEach(([key, val], i) => {
    const label = key.replace(/_/g, ' ').toUpperCase();
    renderField(doc, label, val, i === entries.length - 1);
  });

  renderFooter(doc);
}

/**
 * Save PDF buffer to a temp file and return the file path.
 * Useful for sending via WhatsApp media API.
 */
async function savePDFToTemp(buffer, filename) {
  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, filename || `doc-${Date.now()}.pdf`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

module.exports = { generatePDF, savePDFToTemp };
