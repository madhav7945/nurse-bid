# Project: Nurse App UI/UX Overhaul & Full-Stack Sync

## Architecture
- **Nurse App (`apps/nurse-app`)**: React Native / Expo application for clinicians.
- **Patient App (`apps/patient-app`)**: React Native / Expo application for care seekers.
- **Backend**: Supabase (PostgreSQL, Storage, Realtime WebSockets, Edge Functions).
- **Design Philosophy**: Lean Neumorphism — soft dual shadows, specular inset borders (`rgba(255,255,255,0.7)`), 12-key clinical typography scale (`tabular-nums`), desktop web 412px phone simulator containment, zero generic AI cards.
- **Data Flow**: Bidirectional sync between Patient App and Nurse App via Supabase tables (`jobs`, `bids`, `bookings`, `schedule_shifts`, `vitals_logs`, `conversations`, `messages`, `patient_profiles`, `nurse_profiles`) and WebSocket broadcast channels.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Lean Neumorphic Theme Tokens | Unify typography (12-scale), shadows, borders, and colors in `apps/nurse-app` matching `apps/patient-app` | M1 | Survey UI |
| 2 | Nurse Dashboard Redesign | Polish dashboard cards, vitals radar, stat counters, and header to lean neumorphic standard | M1 | Survey UI |
| 3 | Jobs Screen & Radar Overhaul | Remove solid-black pills (`#111827`), fix bottom clearance (`paddingBottom: 170`), soft blue glow pills | M1 | Survey UI |
| 4 | Profile & Earnings Graph | Integrate `NurseEarningsGraph.tsx`, polish credentials/licenses, clean empty states & avatars | M1 | Survey UI |
| 5 | Messages Screen Layout Fix | Resolve bottom clearance collision with `FloatingTabBar`, fix input bar padding | M1 | Survey UI |
| 6 | Shifts Screen Typographic Cleanliness | Fix broken rupee signs (`₹`), bullet points (`•`), and typography encoding (`SpO₂`) | M1 | Survey UI |
| 7 | Simulator-Safe Modal Sheets | Prevent desktop web `<Modal>` portal leaks outside the 412px simulator frame | M1 | Survey UI |
| 8 | Missing Screens & Assets | Add `SettingsScreen.tsx` & `GameTutorialModal.tsx` onboarding quest | M1 | Survey UI |
| 9 | MessagesScreen Crash Fix | Import `containsContactInfo` from `contactMasking.ts` at line 140 | M2 | Survey Buttons |
| 10 | Chat Payload Corruption Fix | Correct `api.sendMessage` argument count (pass 3 args, payload as content) | M2 | Survey Buttons |
| 11 | Shifts Screen Log Vitals Modal | Mount and render `LogVitalsModal` when `showVitalsModal` is true | M2 | Survey Buttons |
| 12 | Jobs Screen Dead Buttons | Wire `onPress` handlers for "View All" and filter toggle buttons | M2 | Survey Buttons |
| 13 | Jobs Screen budgetMax Fix | Fix `job.budgetMax` to use `hourlyRate` or `budget` | M2 | Survey Buttons |
| 14 | TypeScript Typecheck Parity | Fix all `tsc --noEmit` errors (`ClinicalShift`, event types, `outlineStyle`, implicit `any`) | M2 | Survey Buttons |
| 15 | Dynamic Tab Badge Fix | Fix `FloatingTabBar` permanent "Live" badge so badge is hidden when 0 shifts active | M2 | Survey Buttons |
| 16 | Profile & Image Upload Flow | Verify avatar upload to Supabase `avatars` bucket and profile data mutations | M2 | Survey Buttons |
| 17 | Job Posting Rich Fields Mirroring | Ingest & mirror `proceduresRequired`, `equipmentRequired`, `requiredCertifications`, `mobilityLevel` in `api.ts` & `JobDetailScreen.tsx` | M3 | Survey Sync |
| 18 | Vitals Telemetry Mirroring | Verify bedside vitals insert into `vitals_logs` & `schedule_shifts.vitals` mirroring Patient App dashboard | M3 | Survey Sync |
| 19 | Cross-App Realtime Triggers | Verify `NEW_BID`, `SHIFT_STARTED`, `VITALS_LOGGED`, `BOOKING_CONFIRMED` realtime channel sync | M3 | Survey Sync |
| 20 | Programmatic E2E Test Suite | Node.js verification script `e:\nurse\e2e-sync-test.js` validating DB sync, triggers, and exiting code 0 | M4 | Survey Sync & Prompt |
| 21 | Session & StorageKey Isolation | Separate auth.storageKey (`sb-nurse-auth-token` vs `sb-patient-auth-token`) & complete signout flush | M2 | User Directive |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | UI/UX Lean Neumorphic Redesign | Tokens, screen redesigns, bottom clearances, modals, encoding fixes | none | DONE |
| M2 | Button Logic & Bug Squashing | Messages crash & payload fixes, Log Vitals modal, TS cleanup, tab badge | M1 | IN_PROGRESS |
| M3 | Cross-App Sync & Data Mirroring | Job details mirroring in `api.ts` and `JobDetailScreen`, vitals sync, realtime triggers | M2 | PLANNED |
| M4 | Programmatic E2E Test Suite | Build and run `e:\nurse\e2e-sync-test.js` (8 test suites, exit code 0) | M3 | PLANNED |

## Interface Contracts
### Nurse App (`apps/nurse-app/src/lib/api.ts`) ↔ Supabase Database
- `ClinicalJob`:
  - `id: string`
  - `title: string`
  - `patientName: string`
  - `location: string`
  - `hourlyRate: number`
  - `budget: number`
  - `urgency: 'routine' | 'urgent' | 'emergency'`
  - `proceduresRequired: string[]`
  - `equipmentRequired: string[]`
  - `requiredCertifications: string[]`
  - `mobilityLevel: string`
  - `description: string`
  - `status: string`

### Cross-App Realtime Events (`apps/nurse-app/src/lib/realtime.ts`)
- Channel: `cross-app-events`
- Event types: `NEW_JOB_POSTED`, `NEW_BID`, `BOOKING_CONFIRMED`, `SHIFT_STARTED`, `SHIFT_COMPLETED`, `VITALS_LOGGED`, `NEW_MESSAGE`

## Code Layout
- `apps/nurse-app/src/theme/`: Typography, colors, shadows, borders
- `apps/nurse-app/src/components/`: Reusable UI components (`FloatingTabBar`, `NurseEarningsGraph`, `LogVitalsModal`, etc.)
- `apps/nurse-app/src/screens/`: Screen components (`DashboardScreen`, `JobsScreen`, `JobDetailScreen`, `ShiftsScreen`, `MessagesScreen`, `ProfileScreen`, `AuthScreen`, `SettingsScreen`)
- `apps/nurse-app/src/lib/`: API client (`api.ts`), contact masking (`contactMasking.ts`), realtime sync (`realtime.ts`), supabase client (`supabase.ts`)
- `e2e-sync-test.js`: Root-level automated Node.js test script for Supabase DB & Realtime verification
