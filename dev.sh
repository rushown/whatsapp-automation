#!/bin/bash

# ─────────────────────────────────────────
#  WAutomate — Local Dev Startup Script
# ─────────────────────────────────────────

BOLD='\033[1m'
DIM='\033[2m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
WHITE='\033[1;37m'
NC='\033[0m'

STEP=0

banner() {
  echo ""
  echo -e "${BOLD}${CYAN}  ██╗    ██╗ █████╗ ██╗   ██╗████████╗ ██████╗${NC}"
  echo -e "${BOLD}${CYAN}  ██║    ██║██╔══██╗██║   ██║╚══██╔══╝██╔═══██╗${NC}"
  echo -e "${BOLD}${CYAN}  ██║ █╗ ██║███████║██║   ██║   ██║   ██║   ██║${NC}"
  echo -e "${BOLD}${CYAN}  ██║███╗██║██╔══██║██║   ██║   ██║   ██║   ██║${NC}"
  echo -e "${BOLD}${CYAN}  ╚███╔███╔╝██║  ██║╚██████╔╝   ██║   ╚██████╔╝${NC}"
  echo -e "${BOLD}${CYAN}   ╚══╝╚══╝ ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝${NC}"
  echo -e "${DIM}${WHITE}          WhatsApp Automation — Dev Mode${NC}"
  echo ""
}

step() {
  STEP=$((STEP + 1))
  echo -e "\n${BOLD}${MAGENTA}  [$STEP] $1${NC}"
}

ok()   { echo -e "  ${GREEN}✔${NC}  $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC}  $1"; }
err()  { echo -e "  ${RED}✖${NC}  $1"; exit 1; }
info() { echo -e "  ${CYAN}→${NC}  ${DIM}$1${NC}"; }

divider() { echo -e "\n${DIM}  ────────────────────────────────────────${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Cleanup on Ctrl+C ─────────────────────
cleanup() {
  echo ""
  echo -e "\n${YELLOW}  Shutting down...${NC}"
  [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
  echo -e "  ${GREEN}✔${NC}  All processes stopped. Bye!\n"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── Banner ────────────────────────────────
clear
banner

divider

# ── Check required tools ──────────────────
step "Checking requirements"
command -v node >/dev/null 2>&1 || err "Node.js not installed → https://nodejs.org"
command -v npm  >/dev/null 2>&1 || err "npm not installed"
ok "Node $(node -v)  /  npm $(npm -v)"

# ── PostgreSQL ────────────────────────────
step "PostgreSQL"
PG_RUNNING=false
if command -v pg_isready >/dev/null 2>&1; then
  if pg_isready -q 2>/dev/null; then
    PG_RUNNING=true
    ok "PostgreSQL is running"
  else
    warn "PostgreSQL not running — trying to start..."
    if command -v brew >/dev/null 2>&1; then
      brew services start postgresql@14 2>/dev/null \
        || brew services start postgresql@15 2>/dev/null \
        || brew services start postgresql 2>/dev/null || true
    elif command -v systemctl >/dev/null 2>&1; then
      sudo systemctl start postgresql 2>/dev/null || true
    fi
    sleep 2
    if pg_isready -q 2>/dev/null; then
      PG_RUNNING=true; ok "PostgreSQL started"
    else
      warn "Could not auto-start PostgreSQL — start it manually if needed"
    fi
  fi

  if $PG_RUNNING && command -v psql >/dev/null 2>&1; then
    if ! psql -lqt 2>/dev/null | cut -d'|' -f1 | grep -qw whatsapp_bot; then
      info "Creating database 'whatsapp_bot'..."
      createdb whatsapp_bot 2>/dev/null && ok "Database 'whatsapp_bot' created" || warn "Could not create DB"
    else
      ok "Database 'whatsapp_bot' exists"
    fi
  fi
else
  warn "pg_isready not found — skipping PostgreSQL check"
fi

# ── Environment files ─────────────────────
step "Environment files"
if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
  if [ -f "$SCRIPT_DIR/.env.example" ]; then
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/backend/.env"
    ok "backend/.env created from .env.example"
    warn "Fill in your real API keys in backend/.env before using the bot"
  else
    warn "No backend/.env — create it manually from .env.example"
  fi
else
  ok "backend/.env  ${DIM}(exists)${NC}"
fi

if [ ! -f "$SCRIPT_DIR/frontend/.env" ]; then
  echo "VITE_API_URL=http://localhost:5000" > "$SCRIPT_DIR/frontend/.env"
  ok "frontend/.env created  ${DIM}(VITE_API_URL=http://localhost:5000)${NC}"
else
  ok "frontend/.env  ${DIM}(exists)${NC}"
fi

# ── Install dependencies ──────────────────
step "Installing dependencies"
info "Backend..."
cd "$SCRIPT_DIR/backend" && npm install --silent
ok "Backend packages ready"

info "Frontend..."
cd "$SCRIPT_DIR/frontend" && npm install --silent
ok "Frontend packages ready"

# ── Start backend ─────────────────────────
step "Starting backend"
cd "$SCRIPT_DIR/backend"
npm run dev > /tmp/wautomate-backend.log 2>&1 &
BACKEND_PID=$!
info "Waiting for backend to be healthy..."

READY=false
for i in {1..15}; do
  sleep 1
  printf "  ${DIM}  attempt $i/15...${NC}\r"
  if curl -s http://localhost:5000/api/health >/dev/null 2>&1; then
    READY=true; break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    err "Backend crashed. Run: cat /tmp/wautomate-backend.log"
  fi
done
echo ""
$READY && ok "Backend live  →  http://localhost:5000" || warn "Backend may not be ready yet — check logs"

# ── Start frontend ────────────────────────
step "Starting frontend"
cd "$SCRIPT_DIR/frontend"
npm run dev > /tmp/wautomate-frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 3
ok "Frontend live  →  http://localhost:3000"

# ── Summary ───────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}  ╔═══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}  ║       WAutomate is running! 🚀             ║${NC}"
echo -e "${BOLD}${GREEN}  ╠═══════════════════════════════════════════╣${NC}"
echo -e "${BOLD}${GREEN}  ║${NC}  ${WHITE}Admin UI ${NC} →  ${CYAN}http://localhost:3000/login${NC}  ${BOLD}${GREEN}  ║${NC}"
echo -e "${BOLD}${GREEN}  ║${NC}  ${WHITE}Portal   ${NC} →  ${CYAN}http://localhost:3000/portal${NC} ${BOLD}${GREEN}  ║${NC}"
echo -e "${BOLD}${GREEN}  ║${NC}  ${WHITE}API      ${NC} →  ${CYAN}http://localhost:5000/api/health${NC}${BOLD}${GREEN}║${NC}"
echo -e "${BOLD}${GREEN}  ╠═══════════════════════════════════════════╣${NC}"
echo -e "${BOLD}${GREEN}  ║${NC}  ${DIM}Backend log  →  /tmp/wautomate-backend.log${NC}  ${BOLD}${GREEN}║${NC}"
echo -e "${BOLD}${GREEN}  ║${NC}  ${DIM}Frontend log →  /tmp/wautomate-frontend.log${NC} ${BOLD}${GREEN}║${NC}"
echo -e "${BOLD}${GREEN}  ╠═══════════════════════════════════════════╣${NC}"
echo -e "${BOLD}${GREEN}  ║${NC}  ${YELLOW}Press Ctrl+C to stop all services${NC}          ${BOLD}${GREEN}║${NC}"
echo -e "${BOLD}${GREEN}  ╚═══════════════════════════════════════════╝${NC}"
echo ""

wait