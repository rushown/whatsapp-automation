# Security & AI architecture audit

## How a WhatsApp message is processed (live bot)

```
User WhatsApp message
    → Meta Cloud API webhook POST /webhook
    → Signature check (META_APP_SECRET + X-Hub-Signature-256)
    → Dedup by message ID
    → Rate limit per phone
    → Log inbound to Supabase
    → Active data-collection session? → Groq/DeepSeek parses field → save → next question
    → Else: OpenAI embedding + cosine match against intents
         → No match / ambiguous → SILENCE (no AI chat)
         → Match → workflow:
              text: optional Groq/DeepSeek polish of fixed template
              voice: ElevenLabs TTS
              collect_data: questions + AI field parse
              http: POST payload then optional text reply
```

**Important:** Groq and DeepSeek are **not** used as open chatbots on the webhook. They only:

1. **Personalize** admin-written response templates (same facts, natural tone)
2. **Parse** structured answers during data collection

**OpenAI** is used for **embeddings only** (intent matching), unless `ai_provider=openai` in bot settings.

## Admin "AI Reply" tab (Send Message page)

`POST /api/whatsapp/ai-reply` is a **manual drafting tool** for admins. It does **not** go through intent matching. Use only for testing copy — the live bot never calls this endpoint.

## AI provider matrix

| Provider | Used for | Config |
|----------|----------|--------|
| OpenAI | Embeddings (`text-embedding-3-small`) | `OPENAI_API_KEY` |
| Groq | Chat polish + field parse (default) | `GROQ_API_KEY`, `GROQ_MODEL` |
| DeepSeek | Chat polish + field parse (alt) | `DEEPSEEK_API_KEY` |
| OpenAI GPT-4o-mini | Chat polish if `ai_provider=openai` | `OPENAI_API_KEY` |
| ElevenLabs | Voice intents only | `ELEVENLABS_API_KEY` |

Switch provider in **Admin → Bot settings** (`bot_config.ai_provider`).

## Security controls

| Control | Status |
|---------|--------|
| JWT admin auth | ✅ All `/api/*` except auth, portal OTP, webhook |
| Admin-only routes | ✅ intents, conversations, users, bot-config, document-flows |
| Webhook verify token (GET) | ✅ `WEBHOOK_VERIFY_TOKEN` |
| Webhook HMAC (POST) | ✅ Required in production via `META_APP_SECRET` |
| Production JWT secret | ✅ Server exits if default secret |
| API rate limit | ✅ 300 req / 15 min on `/api/` |
| Per-phone webhook limit | ✅ `PHONE_RATE_LIMIT_PER_MIN` |
| OTP rate limit | ✅ 5 / 15 min per phone |
| Helmet headers | ✅ |
| CORS | ✅ Configurable `FRONTEND_URL` |

## Known gaps (address before high-traffic production)

1. **API keys in `bot_config`** — column names say `_encrypted` but values are stored as plain text in DB. Use Supabase Vault or app-level encryption.
2. **In-memory `api_keys` store** — admin panel keys in `store.js` are not persisted to Supabase; restart loses them. Prefer `bot_config` only.
3. **RLS policies** — schema enables RLS; service role bypasses it. Frontend should not use service key.
4. **Document flows** — separate in-memory feature; not connected to webhook intent engine.

## File necessity summary

See `PROJECT_FILES.md` for the full list. Safe to delete if unused:

- `backend/src/templates/coverletter.html` — not referenced in code
