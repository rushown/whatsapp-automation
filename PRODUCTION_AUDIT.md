# Production audit — final (all 76 files)

**Verified:** `backend npm test` ✅ · `frontend npm run build` ✅ · No broken imports ✅

Legend: 🟢 Required · 🟡 Optional/legacy · 🔴 Removed

---

## Root (9 files)

| File | Verdict | Notes |
|------|---------|-------|
| `.env.example` | 🟢 | Master env template |
| `.gitignore` | 🟢 | Ignores node_modules, .env, dist |
| `README.md` | 🟢 | Setup & deploy |
| `PROJECT_FILES.md` | 🟢 | File map |
| `SECURITY_AND_AI.md` | 🟢 | Security + AI flows |
| `PRODUCTION_AUDIT.md` | 🟢 | This checklist |
| `vercel.json` | 🟢 | Frontend deploy |

---

## scripts/ (2)

| File | Verdict | Notes |
|------|---------|-------|
| `seed-admin.js` | 🟢 | Supabase admin seed |
| `smoke-test.js` | 🟢 | Run via `cd backend && npm test` |

---

## supabase/ (1)

| File | Verdict | Notes |
|------|---------|-------|
| `schema.sql` | 🟢 | Run once; enables pgvector + RLS |

---

## backend/ (38)

| File | Verdict | Notes |
|------|---------|-------|
| `package.json` | 🟢 | Scripts: start, dev, test |
| `package-lock.json` | 🟢 | Lockfile |
| `.env.example` | 🟢 | Backend env copy |
| `render.yaml` | 🟢 | Render deploy + health check |
| **src/index.js** | 🟢 | Server entry, webhook, routes |
| **src/config.js** | 🟢 | Env + production validation |
| **src/store.js** | 🟢 | Fallback admin `admin@example.com` |
| **middleware/auth.js** | 🟢 | JWT; exits if weak secret in prod |
| **middleware/adminOnly.js** | 🟢 | Admin guard |
| **lib/supabase.js** | 🟢 | DB client |
| **lib/logger.js** | 🟢 | JSON logs |
| **lib/webhookSecurity.js** | 🟢 | Meta HMAC |
| **lib/messageDedup.js** | 🟢 | Webhook dedup |
| **lib/textNormalize.js** | 🟢 | Intent matching |
| **lib/rateLimitPhone.js** | 🟢 | Per-phone limit |
| **lib/otpRateLimit.js** | 🟢 | OTP abuse limit |
| **services/webhookProcessor.js** | 🟢 | **Live bot brain** |
| **services/intentMatcher.js** | 🟢 | Embeddings + silence |
| **services/intentRepository.js** | 🟢 | Load intents |
| **services/intentCache.js** | 🟢 | 60s cache |
| **services/embeddings.js** | 🟢 | OpenAI vectors |
| **services/aiProvider.js** | 🟢 | Groq / DeepSeek / OpenAI |
| **services/dataCollection.js** | 🟢 | Forms + save-first |
| **services/whatsappMeta.js** | 🟢 | Meta send API |
| **services/elevenLabs.js** | 🟢 | Voice TTS |
| **services/conversationStore.js** | 🟢 | Conversation reuse |
| **routes/auth.js** | 🟢 | Login + Supabase profiles |
| **routes/intents.js** | 🟢 | Intent CRUD |
| **routes/botConfig.js** | 🟢 | Bot settings |
| **routes/conversations.js** | 🟢 | Admin logs |
| **routes/users.js** | 🟢 | Block/export users |
| **routes/userPortal.js** | 🟢 | OTP portal (secured) |
| **routes/whatsapp.js** | 🟢 | Manual send + AI draft |
| **routes/analytics.js** | 🟢 | Dashboard stats |
| **routes/apiKeys.js** | 🟡 | In-memory keys; use bot_config in prod |
| **routes/contacts.js** | 🟡 | Legacy CRM |
| **routes/templates.js** | 🟡 | Legacy |
| **routes/automation.js** | 🟡 | Cron (in-memory) |
| **routes/documentFlows.js** | 🟡 | **Not on webhook**; admin stub only |
| **documentFlowStore.js** | 🟡 | Supports document-flows route only |

| 🔴 coverletter.html | Removed — unused |

---

## frontend/ (26)

| File | Verdict | Notes |
|------|---------|-------|
| `package.json` | 🟢 | Vite scripts |
| `package-lock.json` | 🟢 | Lockfile |
| `index.html` | 🟢 | SEO meta |
| `vite.config.js` | 🟢 | Dev proxy `/api` |
| **src/index.jsx** | 🟢 | React entry |
| **src/App.jsx** | 🟢 | Routes + admin guard |
| **src/index.css** | 🟢 | Responsive styles |
| **src/lib/api.js** | 🟢 | Axios + JWT |
| **src/context/AuthContext.jsx** | 🟢 | Auth state |
| **src/components/Layout.jsx** | 🟢 | Nav + mobile |
| **pages/LoginPage.jsx** | 🟢 | Fixed credentials + build |
| **pages/DashboardPage.jsx** | 🟢 | Bot metrics |
| **pages/IntentsPage.jsx** | 🟢 | Intent CRUD |
| **pages/BotSettingsPage.jsx** | 🟢 | AI + voice |
| **pages/ConversationsPage.jsx** | 🟢 | Logs |
| **pages/UsersPage.jsx** | 🟢 | User admin |
| **pages/UserPortalLoginPage.jsx** | 🟢 | OTP |
| **pages/UserPortalDashboardPage.jsx** | 🟢 | User history |
| **pages/SendMessagePage.jsx** | 🟡 | Manual send (not live bot) |
| **pages/ApiKeysPage.jsx** | 🟡 | Legacy keys |
| **pages/ContactsPage.jsx** | 🟡 | Legacy |
| **pages/TemplatesPage.jsx** | 🟡 | Legacy |
| **pages/AutomationPage.jsx** | 🟡 | Legacy |
| **pages/AnalyticsPage.jsx** | 🟡 | Extra charts |
| **pages/SettingsPage.jsx** | 🟡 | Profile |
| **pages/DocumentFlowsPage.jsx** | 🟡 | Not wired to webhook |
| `public/robots.txt` | 🟢 | SEO |
| `public/sitemap.xml` | 🟢 | SEO |

---

## Empty folders (safe to ignore)

- `file/` — leftover empty dir from removed duplicates
- `backend/src/temp/` — empty
- `backend/src/templates/` — empty after coverletter removal

---

## Production launch checklist

- [ ] `supabase/schema.sql` applied
- [ ] `node scripts/seed-admin.js`
- [ ] All env vars in hosting (see `.env.example`)
- [ ] Meta webhook → `https://API/webhook`
- [ ] `META_APP_SECRET` + `WEBHOOK_VERIFY_TOKEN` set
- [ ] At least one intent with example phrases
- [ ] `cd backend && npm test` passes
- [ ] `cd frontend && npm run build` passes

---

## What is NOT broken

- Webhook intent bot path: **working**
- Groq/DeepSeek: used only for template polish + field parsing
- OpenAI: embeddings for matching
- Admin panel auth: **working**
- User portal OTP: **working** (requires Supabase + Meta for send)

## Optional cleanup (your choice)

Remove 🟡 legacy pages/routes if you only need the intent bot + admin core.
