# NurseBid System Architecture & Codebase Design

## 1. High-Level Architecture Overview

NurseBid is an on-demand clinical nursing marketplace platform comprised of two specialized Expo React Native mobile applications sharing a synchronized Supabase cloud backend:

- **Nurse Application (`apps/nurse-app`)**: Geared towards licensed clinicians, enabling shift telemetry, real-time GPS check-ins, vital sign charting, proposals/bidding, escrow disbursements, and patient case handover.
- **Patient Application (`apps/patient-app`)**: Geared towards patients and families seeking certified home clinical care, enabling urgent care posting, proposal review, milestone-based escrow funding, live vital monitoring, and clinician communication.

```
                              ┌──────────────────────────────────┐
                              │     Supabase Cloud Engine        │
                              │  - Auth (GoTrue & JWTs)          │
                              │  - PostgreSQL Database Tables   │
                              │  - Realtime WebSockets           │
                              │  - Storage Buckets (Avatars)     │
                              └─────────────────┬────────────────┘
                                                │
                    ┌───────────────────────────┴───────────────────────────┐
                    ▼                                                       ▼
      ┌───────────────────────────┐                           ┌───────────────────────────┐
      │     apps/nurse-app        │                           │     apps/patient-app      │
      ├───────────────────────────┤                           ├───────────────────────────┤
      │ • src/screens/            │                           │ • src/screens/            │
      │ • src/hooks/              │                           │ • src/hooks/              │
      │ • src/api/                │                           │ • src/api/                │
      │ • src/components/         │                           │ • src/components/         │
      │ • src/context/            │                           │ • src/context/            │
      │ • src/config/             │                           │ • src/config/             │
      │ • src/types/              │                           │ • src/types/              │
      │ • src/theme/              │                           │ • src/theme/              │
      └───────────────────────────┘                           └───────────────────────────┘
```

---

## 2. Standardized Directory Layout

Both mobile applications follow a strict, scalable, and modular folder structure:

```
src/
├── api/               # Resource-oriented API services (e.g., jobs.service.ts, shifts.service.ts, bookings.service.ts)
├── components/        # Reusable view components
│   ├── ui/            # Atomic, theme-driven primitives (Button, Card, Badge, Modal, FloatingTabBar)
│   └── onboarding/    # Flow-specific compound components
├── config/            # Centralized environment constants (env.ts)
├── context/           # React Context providers for global session and cross-cutting state
├── hooks/             # Custom business logic hooks separating data fetching from UI screens
├── lib/               # Low-level network clients, Supabase instance, telemetry, and storage
├── screens/           # Clean view containers rendering UI and consuming hooks
├── theme/             # Color palettes, typographic scale, spacing tokens, and shadow definitions
└── types/             # Shared TypeScript domain contracts and API response models
```

---

## 3. Separation of Concerns & Business Logic

### Custom React Hooks
All heavy data fetching, Supabase queries, caching, and real-time WebSocket listeners are extracted from screen files into dedicated custom hooks:
- **Nurse App Hooks**:
  - `useJobs`: Marketplace clinical jobs, filtering, keyword search, and automatic reload on new job events.
  - `useShifts`: Clinical shift records, check-in GPS tracking, vitals recording, and timesheet completion.
  - `usePatients`: Active patient roster, medical history, and medication administration records.
- **Patient App Hooks**:
  - `useMyJobs`: Patient care requests, proposal counts, status filters, and job management.
  - `useBookings`: Confirmed clinician assignments, escrow status, milestone releases.
  - `useVitals`: Live patient telemetry with real-time updates and emergency indicators.
  - `usePushNotifications`: Expo push notification registration and permission handling.

### Resource-Oriented API Services
Instead of monolithic files, API operations are modularized into domain services with complete typed inputs and outputs:
- `api/jobs.service.ts`: Job listings, posting, bid submission.
- `api/shifts.service.ts`: Clinician shift check-in, clock-out, timesheet approval, vital charting.
- `api/bookings.service.ts`: Booking scheduling, escrow funding, milestone disbursement.

---

## 4. Configuration & Environment Management

All sensitive endpoints, API keys, and deployment flags are isolated into `src/config/env.ts`:
- Safely accesses `process.env.EXPO_PUBLIC_SUPABASE_URL` and `Constants.expoConfig?.extra`.
- Guaranteed fallbacks for local and offline testing.
- No hardcoded keys embedded inside client libraries or component files.

---

## 5. UI Architecture & Mobile Engine Safety

- **Styling Rules**: Strictly zero use of `100vh` or `100vw` in React Native stylesheets to prevent native Android Yoga rendering engine crashes. All viewport scaling uses flex layouts, screen dimensions, or `useSafeAreaInsets()`.
- **Soft Neumorphic & Clean Enterprise UI**: Calm, clinical color palettes (`#2E5BFF`, `#10B981`, `#0F172A`), balanced typography, and standardized touch targets across all components.
- **Atomic Components**: Reusable UI components (`Button`, `Card`, `Badge`, `ContainerModal`) ensure design consistency across both applications.

---

## 6. Live Database Constraints & Schema Compatibility

Both applications enforce strict runtime compatibility with PostgreSQL DB constraints and triggers:
- **`schedule_shifts_status_check` Constraint**: The database strictly accepts `('confirmed', 'active', 'completed', 'cancelled')`. Shifts created upon bid acceptance are provisioned with `status: 'confirmed'` (not `'upcoming'`). Both the shift feed, radar cockpit, and tabs in `nurse-app` query and render `'confirmed'` and `'active'` shifts seamlessly.
- **`schedule_shifts` Schema Columns**: The table contains `booking_id`, `nurse_id`, `patient_name`, `date`, `start_time`, `end_time`, `status`, `shift_day`, `total_days`, `net_payout`, and `vitals`. The column `nurse_name` does not exist on `schedule_shifts` and is excluded from insertion payloads.
- **`bookings_escrow_status_check` Constraint**: The constraint exclusively permits `('funded', 'released', 'refunded')`. Newly confirmed bookings are initialized with `escrow_status: 'funded'` (not `'held'`).
- **Bid Submission Trigger Notice (`conversations.patient_id`)**: On proposal insertion into `bids`, DB trigger `handle_new_bid_conversation()` queries `conversations.patient_id`. If the database schema has not yet migrated that column, both `nurse-app/src/lib/api.ts` and `nurse-app/src/api/jobs.service.ts` catch and resolve this by recovering the created bid id and falling back gracefully without failing the clinician's submission flow.

---

## 7. Build & Type Verification

Both applications compile cleanly under strict TypeScript check:
```bash
# Nurse App
cd apps/nurse-app && npm run ts:check   # 0 errors

# Patient App
cd apps/patient-app && npm run ts:check # 0 errors
```

