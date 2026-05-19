# WhatsApp Automation Platform

A full-stack WhatsApp automation platform using Meta Cloud API and Groq AI.

## Project Structure

```
whatsapp-automation/
├── backend/                        # Node.js + Express API
│   ├── index.js                    # Main entry point
│   ├── store.js                    # In-memory data store
│   ├── package.json
│   ├── .env.example                # Environment variables template
│   ├── render.yaml                 # Render.com deployment config
│   └── src/
│       ├── middleware/
│       │   └── auth.js             # JWT auth middleware
│       └── routes/
│           ├── auth.js             # Login / auth routes
│           ├── apikeys.js          # API keys management (Meta, Groq)
│           ├── whatsapp.js         # WhatsApp Meta API routes
│           ├── automation.js       # Automation rules & triggers
│           ├── templates.js        # Message templates
│           ├── contacts.js         # Contacts management
│           └── analytics.js        # Analytics & stats
│
├── frontend/                       # React + Vite app
│   ├── index.html
│   ├── index.css                   # Global styles (cream theme)
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── index.jsx               # Entry point
│       ├── App.jsx                 # Main routing
│       ├── lib/
│       │   └── api.js              # Axios API client
│       ├── context/
│       │   └── AuthContext.jsx     # Auth state & provider
│       ├── components/
│       │   ├── Layout.jsx          # App shell / layout wrapper
│       │   └── Sidebar.jsx         # Navigation sidebar
│       └── pages/
│           ├── LoginPage.jsx
│           ├── DashboardPage.jsx
│           ├── SendMessagePage.jsx
│           ├── TemplatesPage.jsx
│           ├── AutomationPage.jsx
│           ├── ContactsPage.jsx
│           └── AnalyticsPage.jsx
│
├── vercel.json                     # Vercel deployment config (frontend)
├── .gitignore
├── .env.example                    # Root env example
└── README.md
```

## Quick Start

### Backend
```bash
cd backend
cp .env.example .env
# Fill in your credentials in .env
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Deployment

### Backend → Render
- Connect your GitHub repo to [Render](https://render.com)
- Use the included `backend/render.yaml` for automatic config

### Frontend → Vercel
- Connect your GitHub repo to [Vercel](https://vercel.com)
- Set root directory to `frontend`
- The included `vercel.json` handles SPA routing

## Tech Stack
- **Frontend**: React 18, Vite, React Router v6, Axios
- **Backend**: Node.js, Express, JWT, bcryptjs
- **AI**: Groq API
- **Messaging**: Meta WhatsApp Cloud API v18.0
- **Deployment**: Render (backend), Vercel (frontend)

## Test Login
- Email: `admin@example.com`
- Password: `Admin@1234`
