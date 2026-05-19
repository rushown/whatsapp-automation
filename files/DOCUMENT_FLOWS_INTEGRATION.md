# Document Flow System — Integration Guide

## What Was Added

```
backend/src/
├── documentFlowStore.js     # In-memory store for flows + sessions
├── documentFlowEngine.js    # Conversation state machine (IDLE→COLLECTING→CONFIRMING→DONE)
├── groqParser.js            # Groq AI answer parsing + bilingual message generation
├── pdfGenerator.js          # PDF generation via PDFKit (citizenship, letters, certificates)
├── metaApi.js               # Meta WhatsApp API helpers (send text, upload+send PDF)
└── routes/
    ├── documentFlows.js     # REST API: CRUD flows + /generate + /sessions/active
    └── whatsappPatch.js     # Instructions for integrating with existing webhook

frontend/src/pages/
└── DocumentFlowsPage.jsx    # Admin UI for configuring flows and testing
```

---

## Step 1: Install new dependencies

```bash
cd backend
npm install pdfkit groq-sdk form-data
```

---

## Step 2: Register the new route in `backend/index.js`

```js
// Add this with your other route registrations:
const documentFlowsRouter = require('./src/routes/documentFlows');
app.use('/api/document-flows', documentFlowsRouter);
```

---

## Step 3: Integrate with your existing WhatsApp webhook (`backend/src/routes/whatsapp.js`)

Add the import at the top:
```js
const { handleIncomingMessage } = require('../documentFlowEngine');
```

Then in your webhook POST handler, **before** your existing automation logic:
```js
// Inside your message processing loop:
for (const message of messages) {
  const phoneNumber = message.from;
  const messageText = message.text?.body || '';
  const phoneNumberId = value.metadata?.phone_number_id;

  // --- DOCUMENT FLOW HOOK ---
  const groqApiKey  = process.env.GROQ_API_KEY;
  const metaToken   = process.env.META_ACCESS_TOKEN;

  const flowResult = await handleIncomingMessage(
    phoneNumber, messageText, groqApiKey, metaToken, phoneNumberId
  );

  if (flowResult.handled) continue; // Skip other automations
  // --- END HOOK ---

  // ... your existing automation rules below ...
}
```

---

## Step 4: Add to your `.env`

```env
GROQ_API_KEY=gsk_your_groq_key_here
META_ACCESS_TOKEN=your_meta_permanent_token
META_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
```

---

## Step 5: Add the admin page to your React router (`frontend/src/App.jsx`)

```jsx
import DocumentFlowsPage from './pages/DocumentFlowsPage';

// Inside your <Routes>:
<Route path="/document-flows" element={<DocumentFlowsPage />} />
```

And add a sidebar link in `frontend/src/components/Sidebar.jsx`:
```jsx
{ path: '/document-flows', label: '📄 Document Flows', icon: '📄' }
```

---

## How the Bot Flow Works

```
User sends "citizenship" on WhatsApp
           ↓
  [documentFlowEngine] detects keyword → matches "citizenship-app" flow
           ↓
  Bot sends: "Welcome! What is your full name? / तपाईंको पूरा नाम के हो?"
           ↓
  User replies: "Ram Bahadur Thapa"
           ↓
  [groqParser] extracts → { value: "Ram Bahadur Thapa", confidence: 0.98 }
           ↓
  Bot confirms value, asks next question...
           ↓
  [Repeats for all questions]
           ↓
  Bot shows summary: "Are these correct? yes/no"
           ↓
  User: "yes"
           ↓
  [pdfGenerator] creates PDF → [metaApi] uploads + sends to user
           ↓
  User receives PDF document on WhatsApp ✅
```

---

## Admin Panel Features

- **Flows tab**: Create/edit/delete document flows with questions in EN + NP
- **Test Generate**: Provide JSON data manually → download PDF instantly
- **Active Sessions**: See all ongoing conversations in real-time

---

## Adding New Document Types

In `backend/src/pdfGenerator.js`, add a new case:

```js
case 'my_custom_type':
  renderMyCustomDocument(doc, data, flowMeta);
  break;
```

And implement the `renderMyCustomDocument(doc, data, flowMeta)` function.

---

## Production Notes

- Replace `documentFlowStore.js` in-memory maps with Redis or MongoDB
- Use signed URLs or S3 for PDF storage instead of OS temp files
- Add rate limiting per phone number to prevent abuse
- Session timeout: add a cron job to expire sessions older than 24h
