# E2E Test Infra: Nurse App & Patient App Sync

## Test Philosophy
- Programmatic, deterministic, non-flaky Node.js verification test harness.
- Tests actual Supabase database row insertions, column parity, updates, and Realtime WebSocket triggers.
- Eliminates race conditions with WebSocket subscription barrier synchronization (`waitForSubscription`).
- Validates exit code 0 on complete pass.

## Feature Inventory
| # | Feature | Source (Requirement) | Test Suite |
|---|---------|----------------------|------------|
| 1 | Supabase Connectivity & Schema Validation | ORIGINAL_REQUEST §R3 | Suite 1 |
| 2 | Job Requisition Parity & Insertion | ORIGINAL_REQUEST §R3 | Suite 2 |
| 3 | Bid Submission & Event Broadcast | ORIGINAL_REQUEST §R2 | Suite 3 |
| 4 | Booking Confirmation & Shift Generation | ORIGINAL_REQUEST §R2, §R3 | Suite 4 |
| 5 | Live Vitals Telemetry Sync | ORIGINAL_REQUEST §R3 | Suite 5 |
| 6 | Bidirectional Realtime WebSocket Triggers | ORIGINAL_REQUEST §R3 | Suite 6 |
| 7 | Secure Messaging & Contact Masking | ORIGINAL_REQUEST §R2 | Suite 7 |
| 8 | Automated Teardown & Exit Status | ORIGINAL_REQUEST Verification Program | Suite 8 |

## Test Architecture
- **Script Location**: `e:\nurse\e2e-sync-test.js`
- **Runner**: Node.js (`node e2e-sync-test.js`)
- **User-Simulation Framework (User Directive 2026-10-06T15:35:52Z)**: In addition to backend sync verification, integrate/utilize user simulation testing tools (e.g. Playwright / Puppeteer / React Native Testing Library or headless browser harness) to test the application more like real users interacting with screens, buttons, and flows.
- **Success Criteria**: All suites pass; exits with code 0.
- **Teardown**: Automatically cleans up all temporary test records generated during the run.
