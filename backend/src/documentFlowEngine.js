/**
 * documentFlowEngine.js
 * Orchestrates the multi-turn WhatsApp conversation that collects
 * form data, validates it with Groq AI, and triggers PDF generation.
 *
 * State machine per user:
 *   IDLE → COLLECTING → CONFIRMING → GENERATING → DONE
 */

const store = require('../../files/documentFlowStore');
const { parseUserAnswer, detectLanguage, buildQuestionMessage, buildErrorMessage, buildConfirmationMessage, isAffirmative, isNegative } = require('./groqParser');
const { generatePDF, savePDFToTemp } = require('../../files/pdfGenerator');
const metaApi = require('./metaApi');

const MAX_RETRIES = 2; // Max failed attempts per question before skipping

/**
 * Main entry point: called for every incoming WhatsApp message.
 *
 * @param {string} phoneNumber   - Sender's phone number (E.164 without +)
 * @param {string} messageText   - Text of the incoming WhatsApp message
 * @param {string} groqApiKey    - Groq API key
 * @param {string} metaToken     - Meta WhatsApp API token
 * @param {string} phoneNumberId - Meta phone number ID for sending
 * @returns {Promise<{handled: boolean, reply: string|null}>}
 */
async function handleIncomingMessage(phoneNumber, messageText, groqApiKey, metaToken, phoneNumberId) {
  const text = (messageText || '').trim();

  // Check for active session
  let session = store.getSession(phoneNumber);

  // ── No active session: check if this starts a flow ───────────────────────
  if (!session) {
    const flow = store.findFlowByKeyword(text);
    if (!flow) {
      return { handled: false, reply: null }; // Let other handlers deal with it
    }

    // Detect language preference
    const lang = await detectLanguage(text, groqApiKey);

    // Create session
    session = store.createSession(phoneNumber, flow.id);
    store.updateSession(phoneNumber, { lang, retries: 0 });

    // Send welcome + first question
    const firstQ = flow.questions[0];
    const welcomeMsg =
      lang === 'ne'
        ? `🙏 स्वागतम्! *${flow.nameNp || flow.name}* सुरु गरिएको छ।\n\nकृपया निम्न प्रश्नहरूको उत्तर दिनुहोस्।`
        : `🙏 Welcome! Starting *${flow.name}*.\n\nPlease answer the following questions to generate your document.`;

    const questionMsg = buildQuestionMessage(firstQ, lang, 1, flow.questions.length);

    await sendWhatsAppMessage(phoneNumber, `${welcomeMsg}\n\n${questionMsg}`, metaToken, phoneNumberId);
    return { handled: true, reply: null };
  }

  // ── Active session: process based on status ───────────────────────────────
  const flow = store.getFlow(session.flowId);
  if (!flow) {
    store.deleteSession(phoneNumber);
    return { handled: false, reply: null };
  }

  const lang = session.lang || 'both';

  // Handle CONFIRMING state
  if (session.status === 'confirming') {
    if (isAffirmative(text)) {
      // User confirmed — generate PDF
      await sendWhatsAppMessage(
        phoneNumber,
        lang === 'ne'
          ? '⏳ तपाईंको कागजात तयार गर्दैछौं, कृपया प्रतीक्षा गर्नुहोस्...'
          : '⏳ Generating your document, please wait...',
        metaToken,
        phoneNumberId
      );

      try {
        const pdfBuffer = await generatePDF(flow.documentType, session.collectedData, flow);
        const fileName = `${flow.documentType}-${phoneNumber}-${Date.now()}.pdf`;
        const filePath = await savePDFToTemp(pdfBuffer, fileName);

        // Upload and send PDF via Meta API
        const mediaId = await metaApi.uploadMedia(filePath, 'application/pdf', metaToken, phoneNumberId);
        await metaApi.sendDocument(phoneNumber, mediaId, fileName, metaToken, phoneNumberId);

        store.saveCompletedDoc(phoneNumber, {
          phoneNumber,
          flowId: flow.id,
          data: session.collectedData,
          fileName,
        });

        const doneMsg =
          lang === 'ne'
            ? '✅ तपाईंको कागजात सफलतापूर्वक बनाइएको छ! माथि PDF फाइल हेर्नुहोस्।'
            : '✅ Your document has been generated successfully! See the PDF above.';

        await sendWhatsAppMessage(phoneNumber, doneMsg, metaToken, phoneNumberId);
        store.deleteSession(phoneNumber);
      } catch (err) {
        console.error('[FlowEngine] PDF generation error:', err);
        await sendWhatsAppMessage(
          phoneNumber,
          lang === 'ne'
            ? '❌ कागजात बनाउँदा समस्या भयो। कृपया पछि पुन: प्रयास गर्नुहोस्।'
            : '❌ Error generating document. Please try again later.',
          metaToken,
          phoneNumberId
        );
        store.deleteSession(phoneNumber);
      }

      return { handled: true };
    } else if (isNegative(text)) {
      // User wants to restart
      store.deleteSession(phoneNumber);
      await sendWhatsAppMessage(
        phoneNumber,
        lang === 'ne'
          ? '🔄 ठीक छ, फेरि सुरु गरौं। अघिल्लो किवर्ड पठाउनुहोस्।'
          : '🔄 Okay, let\'s start over. Send the keyword to begin again.',
        metaToken,
        phoneNumberId
      );
      return { handled: true };
    } else {
      // Unclear response
      const confirmMsg = buildConfirmationMessage(session.collectedData, flow.questions, lang);
      await sendWhatsAppMessage(phoneNumber, confirmMsg, metaToken, phoneNumberId);
      return { handled: true };
    }
  }

  // ── COLLECTING state: process current question answer ────────────────────
  const currentQ = flow.questions[session.currentStep];
  if (!currentQ) {
    // All questions done — move to confirmation
    await moveToConfirmation(session, flow, phoneNumber, lang, metaToken, phoneNumberId);
    return { handled: true };
  }

  // Parse the answer with Groq AI
  const parsed = await parseUserAnswer(text, currentQ, groqApiKey);

  if (!parsed.value || parsed.confidence < 0.5) {
    // Bad answer — retry or skip
    const retries = (session.retries || 0) + 1;
    if (retries >= MAX_RETRIES) {
      // Skip this field
      const collectedData = { ...session.collectedData, [currentQ.field]: null };
      const nextStep = session.currentStep + 1;
      store.updateSession(phoneNumber, { collectedData, currentStep: nextStep, retries: 0 });

      const skipMsg =
        lang === 'ne'
          ? `⚠️ यो क्षेत्र छोड्दैछौं। अर्को प्रश्नमा जाउँ।`
          : `⚠️ Skipping this field. Moving to next question.`;

      const nextQ = flow.questions[nextStep];
      if (nextQ) {
        const nextQMsg = buildQuestionMessage(nextQ, lang, nextStep + 1, flow.questions.length);
        await sendWhatsAppMessage(phoneNumber, `${skipMsg}\n\n${nextQMsg}`, metaToken, phoneNumberId);
      } else {
        await sendWhatsAppMessage(phoneNumber, skipMsg, metaToken, phoneNumberId);
        const updatedSession = store.getSession(phoneNumber);
        await moveToConfirmation(updatedSession, flow, phoneNumber, lang, metaToken, phoneNumberId);
      }
    } else {
      store.updateSession(phoneNumber, { retries });
      const errMsg = buildErrorMessage(currentQ, parsed.error, lang);
      await sendWhatsAppMessage(phoneNumber, errMsg, metaToken, phoneNumberId);
    }
    return { handled: true };
  }

  // Valid answer — store it and advance
  const collectedData = { ...session.collectedData, [currentQ.field]: parsed.value };
  const nextStep = session.currentStep + 1;
  store.updateSession(phoneNumber, { collectedData, currentStep: nextStep, retries: 0 });

  const nextQ = flow.questions[nextStep];
  if (nextQ) {
    const nextQMsg = buildQuestionMessage(nextQ, lang, nextStep + 1, flow.questions.length);
    await sendWhatsAppMessage(phoneNumber, `✓ ${parsed.value}\n\n${nextQMsg}`, metaToken, phoneNumberId);
  } else {
    // All questions answered — confirm
    const updatedSession = store.getSession(phoneNumber);
    await moveToConfirmation(updatedSession, flow, phoneNumber, lang, metaToken, phoneNumberId);
  }

  return { handled: true };
}

async function moveToConfirmation(session, flow, phoneNumber, lang, metaToken, phoneNumberId) {
  store.updateSession(phoneNumber, { status: 'confirming' });
  const confirmMsg = buildConfirmationMessage(session.collectedData, flow.questions, lang);
  await sendWhatsAppMessage(phoneNumber, confirmMsg, metaToken, phoneNumberId);
}

async function sendWhatsAppMessage(phoneNumber, text, metaToken, phoneNumberId) {
  try {
    await metaApi.sendTextMessage(phoneNumber, text, metaToken, phoneNumberId);
  } catch (err) {
    console.error('[FlowEngine] sendWhatsAppMessage error:', err.message);
  }
}

module.exports = { handleIncomingMessage };
