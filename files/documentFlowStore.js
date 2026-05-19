/**
 * documentFlowStore.js
 * In-memory store for document flows and active conversation sessions.
 * In production, replace with Redis or a database.
 */

// Document flow definitions (admin-configured)
// Each flow has: id, name, documentType, questions, outputTemplate
const documentFlows = new Map();

// Active user sessions keyed by WhatsApp phone number
// Each session: { flowId, currentStep, collectedData, startedAt, phoneNumber }
const activeSessions = new Map();

// Completed documents (for retrieval)
const completedDocs = new Map();

// Seed with a sample "Citizenship Application" flow
documentFlows.set('citizenship-app', {
  id: 'citizenship-app',
  name: 'Citizenship Application Form',
  nameNp: 'नागरिकता आवेदन फारम',
  documentType: 'citizenship',
  language: 'bilingual',
  active: true,
  triggerKeywords: ['citizenship', 'नागरिकता', 'document', 'form'],
  questions: [
    {
      id: 'full_name',
      field: 'full_name',
      label: 'Full Name',
      labelNp: 'पूरा नाम',
      questionEn: 'What is your full name? (as in official documents)',
      questionNp: 'तपाईंको पूरा नाम के हो? (आधिकारिक कागजातमा भए जस्तै)',
      validationType: 'text',
      required: true,
    },
    {
      id: 'dob',
      field: 'date_of_birth',
      label: 'Date of Birth',
      labelNp: 'जन्म मिति',
      questionEn: 'What is your date of birth? (e.g. 2045-03-15 BS or 1988-06-29 AD)',
      questionNp: 'तपाईंको जन्म मिति के हो? (जस्तै: २०४५-०३-१५ वा 1988-06-29)',
      validationType: 'date',
      required: true,
    },
    {
      id: 'father_name',
      field: 'father_name',
      label: "Father's Name",
      labelNp: 'बुबाको नाम',
      questionEn: "What is your father's full name?",
      questionNp: 'तपाईंका बुबाको पूरा नाम के हो?',
      validationType: 'text',
      required: true,
    },
    {
      id: 'mother_name',
      field: 'mother_name',
      label: "Mother's Name",
      labelNp: 'आमाको नाम',
      questionEn: "What is your mother's full name?",
      questionNp: 'तपाईंकी आमाको पूरा नाम के हो?',
      validationType: 'text',
      required: true,
    },
    {
      id: 'permanent_address',
      field: 'permanent_address',
      label: 'Permanent Address',
      labelNp: 'स्थायी ठेगाना',
      questionEn: 'What is your permanent address? (District, Municipality/VDC, Ward No)',
      questionNp: 'तपाईंको स्थायी ठेगाना के हो? (जिल्ला, नगरपालिका/गाउँपालिका, वडा नं.)',
      validationType: 'text',
      required: true,
    },
    {
      id: 'phone',
      field: 'phone_number',
      label: 'Phone Number',
      labelNp: 'फोन नम्बर',
      questionEn: 'What is your phone number?',
      questionNp: 'तपाईंको फोन नम्बर के हो?',
      validationType: 'phone',
      required: true,
    },
  ],
  confirmationMessageEn: 'Thank you! All your details have been collected. Generating your document now...',
  confirmationMessageNp: 'धन्यवाद! तपाईंका सबै विवरणहरू संकलन गरिएका छन्। तपाईंको कागजात तयार गर्दैछौं...',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ── Sessions ──────────────────────────────────────────────────────────────────

function createSession(phoneNumber, flowId) {
  const session = {
    phoneNumber,
    flowId,
    currentStep: 0,
    collectedData: {},
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    status: 'active', // active | completed | abandoned
  };
  activeSessions.set(phoneNumber, session);
  return session;
}

function getSession(phoneNumber) {
  return activeSessions.get(phoneNumber) || null;
}

function updateSession(phoneNumber, updates) {
  const session = activeSessions.get(phoneNumber);
  if (!session) return null;
  const updated = { ...session, ...updates, lastActivityAt: new Date().toISOString() };
  activeSessions.set(phoneNumber, updated);
  return updated;
}

function deleteSession(phoneNumber) {
  activeSessions.delete(phoneNumber);
}

// ── Flows ─────────────────────────────────────────────────────────────────────

function getAllFlows() {
  return Array.from(documentFlows.values());
}

function getFlow(id) {
  return documentFlows.get(id) || null;
}

function createFlow(flowData) {
  const id = flowData.id || `flow-${Date.now()}`;
  const flow = {
    ...flowData,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  documentFlows.set(id, flow);
  return flow;
}

function updateFlow(id, updates) {
  const flow = documentFlows.get(id);
  if (!flow) return null;
  const updated = { ...flow, ...updates, updatedAt: new Date().toISOString() };
  documentFlows.set(id, updated);
  return updated;
}

function deleteFlow(id) {
  return documentFlows.delete(id);
}

function findFlowByKeyword(text) {
  const lowerText = text.toLowerCase();
  for (const flow of documentFlows.values()) {
    if (!flow.active) continue;
    if (flow.triggerKeywords && flow.triggerKeywords.some(kw => lowerText.includes(kw.toLowerCase()))) {
      return flow;
    }
  }
  return null;
}

// ── Completed Docs ────────────────────────────────────────────────────────────

function saveCompletedDoc(phoneNumber, docInfo) {
  const key = `${phoneNumber}-${Date.now()}`;
  completedDocs.set(key, { ...docInfo, completedAt: new Date().toISOString() });
  return key;
}

function getCompletedDocs(phoneNumber) {
  return Array.from(completedDocs.values()).filter(d => d.phoneNumber === phoneNumber);
}

module.exports = {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  getAllFlows,
  getFlow,
  createFlow,
  updateFlow,
  deleteFlow,
  findFlowByKeyword,
  saveCompletedDoc,
  getCompletedDocs,
  getAllSessions: () => Array.from(activeSessions.values()),
};
