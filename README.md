# 🏥 NurseBid — Healthcare Marketplace Monorepo

Welcome to the **NurseBid** platform codebase! This repository is organized as a modern, clean, production-grade **Startup Monorepo** separating the Next.js 16 Client Portal from the Express.js + TypeScript REST API Engine.

---

## 📁 Repository Architecture & Folder Structure

```
nurse/
├── 📂 apps/
│   ├── 🌐 frontend/                      # NEXT.JS 16 CLIENT APPLICATION (Port 3000)
│   │   ├── 📂 src/
│   │   │   ├── 📂 app/                   # App Router Pages & Layouts
│   │   │   │   ├── 🩺 (dashboard)/nurse/ # NURSE PORTAL (Active development)
│   │   │   │   │   ├── dashboard/        # Clinical KPI Cockpit & Quick Actions
│   │   │   │   │   ├── jobs/             # Shift Marketplace (Filter, Map & Bidding)
│   │   │   │   │   ├── my-bids/          # Bidding Pipeline (Pending -> Accepted)
│   │   │   │   │   ├── shifts/           # Active Shift Tracking (GPS Check-In)
│   │   │   │   │   ├── patients/         # Patient Records, eMAR & Vitals Logs
│   │   │   │   │   ├── schedule/         # Shift Calendar & Availability Manager
│   │   │   │   │   ├── earnings/         # Escrow Ledger & UPI Instant Payouts
│   │   │   │   │   ├── messages/         # Real-time Coordination Chat
│   │   │   │   │   ├── notes/            # Clinical Documentation
│   │   │   │   │   └── profile/          # State Council Verified Digital ID
│   │   │   │   ├── 👥 patient/           # PATIENT PORTAL (Post care, evaluate bids)
│   │   │   │   ├── 🔐 (auth)/            # Authentication (Login, Register, OTP)
│   │   │   │   ├── 🛡️ (admin)/           # Admin Compliance & Disputes Mediation
│   │   │   │   ├── layout.tsx            # Global Root Layout & Providers
│   │   │   │   ├── globals.css           # Global Theme & Tailwind CSS tokens
│   │   │   │   └── page.tsx              # Marketplace Landing Page
│   │   │   ├── 📂 components/            # Modular UI Components
│   │   │   │   ├── layout/               # Global Header & Navigation Sidebar
│   │   │   │   └── ui/                   # Reusable components (Cards, Leaflet Map, Badges)
│   │   │   ├── 📂 lib/                   # Shared Utilities & API Client
│   │   │   │   ├── api.ts                # Unified API Client (Calls Express Backend)
│   │   │   │   ├── trust-score.ts        # Algorithm for 0-100 Clinical Trust Score
│   │   │   │   └── utils.ts              # Tailwind class merge & date helpers
│   │   │   └── 📂 types/                 # Shared UI TypeScript Interfaces
│   │   ├── 📂 public/                    # Static clinical images & icons
│   │   ├── .env.local                    # NEXT_PUBLIC_API_URL=http://localhost:5000/api
│   │   ├── package.json                  # Frontend-only dependencies
│   │   └── tsconfig.json                 # Path aliases (@/* -> ./src/*)
│   │
│   └── ⚙️ backend/                       # EXPRESS + TYPESCRIPT REST API ENGINE (Port 5000)
│       ├── 📂 src/
│       │   ├── 📂 controllers/           # Business Logic for incoming HTTP requests
│       │   │   ├── jobs.controller.ts    # Search, filter, and sort care requests
│       │   │   ├── bids.controller.ts    # Bid submission, escrow math (10% fee)
│       │   │   ├── messages.controller.ts# In-app chat, calling & attachments
│       │   │   ├── dashboard.controller.ts # KPI calculations & metrics
│       │   │   ├── bookings.controller.ts# Escrow contracts & milestones
│       │   │   └── ...                   # Schedule, Notes, Notifications, Admin
│       │   ├── 📂 routes/                # Express Route Declarations
│       │   │   ├── jobs.routes.ts        # GET/POST /api/jobs
│       │   │   ├── bids.routes.ts        # GET/POST /api/bids
│       │   │   ├── messages.routes.ts    # GET/POST /api/messages
│       │   │   └── ...
│       │   ├── 📂 data/                  # In-memory mock database & seed records
│       │   ├── 📂 middleware/            # JWT Auth, Role verification, Error Handler
│       │   ├── 📂 types/                 # Data contracts, Job, Bid, User models
│       │   ├── 📂 utils/                 # Standardized JSON response formatters
│       │   └── index.ts                  # Express server entry point & middleware stack
│       ├── .env                          # PORT=5000, JWT_SECRET, FRONTEND_URL
│       └── package.json                  # Backend dependencies
│
├── package.json                          # ROOT MONOREPO (Runs frontend & backend)
└── README.md                             # You are here!
```

---

## 🚀 Quick Start Guide

### 1. Install all dependencies (Fullstack)
At the root directory (`nurse/`), run:
```bash
npm install
```

### 2. Start Both Frontend & Backend Concurrently
To start the complete fullstack application in one command:
```bash
npm run dev
```
- 🌐 **Frontend** will be running at: [http://localhost:3000](http://localhost:3000)
- ⚙️ **Backend API** will be running at: [http://localhost:5000/api](http://localhost:5000/api)
- 🩺 **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### 3. Individual Service Commands
If you want to run or build services independently:
- **Frontend only:** `npm run dev:frontend`
- **Backend only:** `npm run dev:backend`
- **Build frontend:** `npm run build:frontend`
- **Build backend:** `npm run build:backend`

---

## 🔄 How the Frontend Connects to the Backend

1. When a nurse searches for jobs or submits a bid in the UI (`apps/frontend/src/app/(dashboard)/nurse/jobs/page.tsx`), the page calls methods on `api` from `apps/frontend/src/lib/api.ts`.
2. `api.ts` makes an HTTP request to `http://localhost:5000/api/jobs`.
3. The Express Backend receives the request in `apps/backend/src/routes/jobs.routes.ts`.
4. The route invokes the controller in `apps/backend/src/controllers/jobs.controller.ts`.
5. The controller filters data, computes pricing/take-home escrow splits, and responds with a clean JSON format:
   ```json
   {
     "success": true,
     "data": [ ... ],
     "count": 12
   }
   ```
6. The frontend renders the high-density job cards, interactive Leaflet map pins, and live fee calculations.

---

## 🎯 Current Status & Roadmap

- ✅ **Nurse Portal**: Complete with high-density Job Marketplace, Multi-filter search engine, Interactive Map, Bidding flow, eMAR Clinical Notes, Shift Schedule, and Escrow Payout ledger.
- ⏳ **Patient Portal** (`apps/frontend/src/app/patient`): Multi-step care posting form, Bid Comparison Board, Escrow funding via Razorpay.
- ⏳ **Admin Portal** (`apps/frontend/src/app/(admin)`): Nursing Council license verification queue and escrow dispute resolution.
