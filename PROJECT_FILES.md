# Project files reference

> **Security & AI flow:** see [SECURITY_AND_AI.md](./SECURITY_AND_AI.md)

## Required for production bot

| Path | Purpose |
|------|---------|
| `backend/src/index.js` | Express server, webhook, routes |
| `backend/src/config.js` | Environment configuration |
| `backend/src/services/webhookProcessor.js` | Core bot logic |
| `backend/src/services/intentMatcher.js` | Embedding intent matching |
| `backend/src/services/intentCache.js` | Hot-path intent cache |
| `backend/src/services/embeddings.js` | OpenAI embeddings |
| `backend/src/services/aiProvider.js` | Groq / DeepSeek / OpenAI chat |
| `backend/src/services/dataCollection.js` | Multi-step forms |
| `backend/src/services/whatsappMeta.js` | Meta Cloud API send |
| `backend/src/services/elevenLabs.js` | Voice TTS |
| `backend/src/lib/supabase.js` | Database client |
| `supabase/schema.sql` | Database schema + RLS |

## Required for admin UI

| Path | Purpose |
|------|---------|
| `frontend/index.html` | Vite entry + SEO |
| `frontend/src/App.jsx` | Routing |
| `frontend/src/components/Layout.jsx` | Shell + nav |
| `frontend/src/pages/IntentsPage.jsx` | Intent CRUD |
| `frontend/src/pages/BotSettingsPage.jsx` | AI + voice config |
| `frontend/src/pages/ConversationsPage.jsx` | Logs |
| `frontend/src/pages/UsersPage.jsx` | User management |

## Optional / legacy

| Path | Purpose |
|------|---------|
| `backend/src/routes/documentFlows.js` | Simple in-memory doc flows (admin) |
| `backend/src/documentFlowStore.js` | Store for document flows |
| `backend/src/routes/whatsapp.js` | Manual send from admin |
| `backend/src/templates/coverletter.html` | Unused template asset (safe to delete) |

## Removed (do not restore)

- `file/` — duplicate broken copies; logic lives under `backend/src/`
- `chunks.txt` — scratch notes
- `documentFlowEngine.js` — broken imports
- `groqParser.js` / `metaApi.js` — replaced by `aiProvider.js` / `whatsappMeta.js`
- `frontend/src/components/Sidebar.jsx` — unused (Layout has nav)

## Test

```bash
cd backend && npm test
# With server running:
SMOKE_BASE_URL=http://localhost:5000 npm test
```
