#!/bin/bash

# ─────────────────────────────────────────
#  WAutomate — Local Dev Startup Script
# ─────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${CYAN}[dev]${NC} $1"; }
ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Cleanup on Ctrl+C ─────────────────────
cleanup() {
  echo ""
  log "Shutting down..."
  [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
  ok "All stopped. Bye!"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── Check required tools ──────────────────
command -v node >/dev/null 2>&1 || err "Node.js not installed. Get it at https://nodejs.org"
command -v npm  >/dev/null 2>&1 || err "npm not installed."
ok "Node $(node -v) / npm $(npm -v)"

# ── PostgreSQL ────────────────────────────
log "Checking PostgreSQL..."
PG_RUNNING=false
if command -v pg_isready >/dev/null 2>&1; then
  if pg_isready -q 2>/dev/null; then
    PG_RUNNING=true
    ok "PostgreSQL already running"
  else
    warn "PostgreSQL not running — trying to start..."
    if command -v brew >/dev/null 2>&1; then
      brew services start postgresql@14 2>/dev/null \
        || brew services start postgresql@15 2>/dev/null \
        || brew services start postgresql 2>/dev/null \
        || true
    elif command -v systemctl >/dev/null 2>&1; then
      sudo systemctl start postgresql 2>/dev/null || true
    fi
    sleep 2
    if pg_isready -q 2>/dev/null; then
      PG_RUNNING=true
      ok "PostgreSQL started"
    else
      warn "Could not auto-start PostgreSQL. Start it manually if you need local DB."
    fi
  fi

  # Create DB if it doesn't exist
  if $PG_RUNNING && command -v createdb >/dev/null 2>&1; then
    if ! psql -lqt 2>/dev/null | cut -d'|' -f1 | grep -qw whatsapp_bot; then
      log "Creating database 'whatsapp_bot'..."
      createdb whatsapp_bot 2>/dev/null && ok "Database 'whatsapp_bot' created" || warn "Could not create DB (may already exist)"
    else
      ok "Database 'whatsapp_bot' exists"
    fi
  fi
else
  warn "pg_isready not found — skipping PostgreSQL check"
fi

# ── Backend .env ──────────────────────────
if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
  if [ -f "$SCRIPT_DIR/.env.example" ]; then
    log "Creating backend/.env from .env.example..."
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/backend/.env"
    ok "backend/.env created — edit it with your real keys before using the bot"
  else
    warn "No backend/.env found — create backend/.env manually"
  fi
else
  ok "backend/.env exists"
fi

# ── Frontend .env ─────────────────────────
if [ ! -f "$SCRIPT_DIR/frontend/.env" ]; then
  log "Creating frontend/.env..."
  echo "VITE_API_URL=http://localhost:5000" > "$SCRIPT_DIR/frontend/.env"
  ok "frontend/.env created"
else
  ok "frontend/.env exists"
fi

# ── Install deps ──────────────────────────
log "Installing backend dependencies..."
cd "$SCRIPT_DIR/backend" && npm install --silent && ok "Backend deps ready"

log "Installing frontend dependencies..."
cd "$SCRIPT_DIR/frontend" && npm install --silent && ok "Frontend deps ready"

# ── Start backend ─────────────────────────
log "Starting backend..."
cd "$SCRIPT_DIR/backend"
npm run dev > /tmp/wautomate-backend.log 2>&1 &
BACKEND_PID=$!

# Wait up to 10s for backend
for i in {1..10}; do
  sleep 1
  if curl -s http://localhost:5000/api/health >/dev/null 2>&1; then
    ok "Backend up at http://localhost:5000"
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    err "Backend crashed. Check logs: cat /tmp/wautomate-backend.log"
  fi
done

# ── Start frontend ────────────────────────
log "Starting frontend..."
cd "$SCRIPT_DIR/frontend"
npm run dev > /tmp/wautomate-frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 3

# ── Summary ───────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${GREEN}  WAutomate is running!${NC}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Admin UI  →  ${CYAN}http://localhost:3000/login${NC}"
echo -e "  Portal    →  ${CYAN}http://localhost:3000/portal${NC}"
echo -e "  API       →  ${CYAN}http://localhost:5000/api/health${NC}"
echo -e "  Backend log  →  ${YELLOW}cat /tmp/wautomate-backend.log${NC}"
echo -e "  Frontend log →  ${YELLOW}cat /tmp/wautomate-frontend.log${NC}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${YELLOW}Ctrl+C${NC} to stop everything"
echo ""

wait