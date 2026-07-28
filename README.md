# Supervision & CEU Tracker

Paid tracker for mental-health trainees (LPCC, LGSW, LMFT, LADC) and their supervisors.
Two editions from one shared core:

- **Lite** — one-time purchase, offline desktop app (Tauri v2 + local encrypted SQLite).
- **Web** — subscription SaaS on Railway (Next.js + Postgres) adding linking, e-signature
  sign-off, calendar sync, cloud backup, and supervisor dashboards.

See `docs/Supervision_CEU_Tracker_Phase1_Spec.docx` and
`docs/Supervision_CEU_Tracker_Phase2_Architecture.docx` for the full spec and design.

## Repository layout (monorepo)

```
packages/core        Shared TypeScript domain + rules-as-data engine + progress math  [BUILT ✓]
packages/data        Local SQLite persistence implementing the DataAdapter interface  [BUILT ✓]
apps/desktop         Lite React UI: setup, logging, live progress, encrypted backup    [BUILT ✓]
  src/types.ts         Domain + RequirementSet + record + progress types
  src/rules/           Rules-as-data (Minnesota seeded: all 4 licenses, every route)
  src/engine.ts        computeProgress(requirementSet, recordBook) -> ProgressReport
  test/                Automated test suite (node:test)
rules-data/          Seed data provenance (SOURCES.md)

# Next build increments (Lite-first per your Phase 3 decision):
apps/desktop         Tauri v2 shell + offline license-key validation                  [next]
apps/desktop billing Stripe one-time license issuance/validation                      [next]
```

## Verify it yourself

```
npm install          # root; sets up the workspace
npm test             # runs all package test suites (19 tests)
npm run typecheck    # type-checks every package
```

## Run the Lite app (dev)

```
cd apps/desktop
npm run dev          # opens the Lite UI in your browser at http://localhost:5173
npm run build        # production bundle (also runs the type-check)
```

The desktop dev server renders the exact React UI that the Tauri shell will wrap.
It uses an in-memory adapter in the browser; the Tauri build swaps in the encrypted
SQLite store behind the same DataAdapter interface. Tauri packaging + Stripe license
flow are the next increments.

## Status

- **Core + Minnesota rules + engine: built, 9/9 tests passing.**
- **Local SQLite data layer (DataAdapter): built, 3/3 integration tests passing.**
- **Lite React UI (setup / logging / live progress): built, type-checks and production-builds; 3/3 UI data-path tests passing.**
- **Encrypted backup / restore (passphrase, AES-GCM): built; 4/4 crypto round-trip tests passing. Doubles as the Lite→Web migration file.**
- Desktop UI, local encrypted DB, Tauri shell, and Stripe license flow are the next
  increment. Final signed Windows/macOS installers are produced via the app's build
  scripts on a Windows/macOS machine or CI (cannot be cross-compiled here).
