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
apps/desktop         Lite React UI + Tauri v2 desktop shell + SQLite persistence        [BUILT ✓]
  src-tauri/           Rust shell, SQL migrations, window config, icons               [compile on Windows]
apps/web             Web edition: Next.js + Postgres/Prisma + Auth.js (Railway)        [BUILT ✓, deploy on Railway]
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

## Run in the browser (fast dev)

```
cd apps/desktop
npm run dev          # http://localhost:5173  (in-memory data, resets on refresh)
```

## Build the real Windows desktop app (Tauri)

One-time prerequisites on the Windows machine:
1. Rust toolchain — install from https://rustup.rs (includes cargo).
2. Microsoft C++ Build Tools (Visual Studio Build Tools, "Desktop development with C++").
3. WebView2 runtime — preinstalled on Windows 10/11.

Then:

```
cd apps/desktop
npm install
npm run tauri:dev    # launches the desktop app; compiles Rust on first run (slow once)
npm run tauri:build  # produces installers in src-tauri/target/release/bundle/
```

On desktop, data persists to a local SQLite database (`supervision.db` in the app's
data folder) via the same DataAdapter interface the browser build uses — no UI change.

### Remaining desktop hardening
- At-rest DB encryption (SQLCipher) is not yet wired; the desktop DB is currently
  plain local SQLite. Backup EXPORT files are already AES-GCM encrypted. Enabling
  SQLCipher is a documented follow-up.
- Stripe one-time license-key flow is the next increment.

## Status

- **Core + Minnesota rules + engine: built, 9/9 tests passing.**
- **Local SQLite data layer (DataAdapter): built, 3/3 integration tests passing.**
- **Lite React UI (setup / logging / live progress): built, type-checks and production-builds; 3/3 UI data-path tests passing.**
- **Encrypted backup / restore (passphrase, AES-GCM): built; 4/4 crypto round-trip tests passing. Doubles as the Lite→Web migration file.**
- **Web edition foundation (Next.js + Postgres + Auth.js): built, type-checks clean. Accounts, credential setup, online logging, live progress reusing core. Deploy-ready (Dockerfile + railway.json). Run `next build`/deploy on Railway (Prisma engines are network-blocked in this build env).**
- Desktop UI, local encrypted DB, Tauri shell, and Stripe license flow are the next
  increment. Final signed Windows/macOS installers are produced via the app's build
  scripts on a Windows/macOS machine or CI (cannot be cross-compiled here).
