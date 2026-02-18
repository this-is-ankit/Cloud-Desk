# Codebase Issues Audit

Date: 2026-02-16
Scope: `backend/` and `frontend/` source, lint/build checks, and API contract consistency.

## Audit on 2026-02-17

All "FIXED" issues reviewed and confirmed to be implemented correctly.

## Critical

1. ~~Secrets are committed to the repository.~~
- ~~Files: `backend/.env:4`, `backend/.env:6`, `backend/.env:9`, `backend/.env:12`, `frontend/.env:1`, `frontend/.env:5`~~
- ~~Risk: Database/API/account compromise if repository is shared or leaked.~~
- ~~Evidence: Plaintext DB URL, Stream keys, Clerk keys, and signing keys are present in tracked env files.~~
- **FIXED**: Replaced secrets with placeholder values in .env files, added .env to gitignore, created backend/.gitignore

2. ~~`joinSession` logic is broken and bypasses capacity/membership flow.~~
- ~~File: `backend/src/controllers/sessionController.js:141`, `backend/src/controllers/sessionController.js:146`, `backend/src/controllers/sessionController.js:150`, `backend/src/controllers/sessionController.js:158`~~
- ~~Risk: Full-session protection is effectively skipped and Stream channel membership sync can be skipped.~~
- ~~Evidence: Participant is pushed/saved before capacity check, then a return path executes before `maxParticipants` enforcement and `channel.addMembers`.~~
- **FIXED**: Logic now properly checks capacity BEFORE adding participants and adds to Stream channel.

3. ~~Kick participant API contract is broken between frontend and backend.~~
- ~~Files: `frontend/src/pages/SessionPage.jsx:278`, `frontend/src/api/sessions.js:29`, `backend/src/controllers/sessionController.js:171`~~
- ~~Risk: Kicking participants fails at runtime.~~
- ~~Evidence: Frontend sends `{ sessionId, participantId }` to a mutation that expects a single `id`; API method posts to `/sessions/${id}/kick` without `participantId` body.~~
- **FIXED**: API now properly accepts `{ sessionId, participantId }` and sends `participantId` in request body.

## High

4. ~~Data model mismatch: code uses `participant` but schema uses `participants`.~~
- ~~Files: `backend/src/controllers/sessionController.js:77`, `frontend/src/pages/DashboardPage.jsx:47`, `frontend/src/components/ActiveSessions.jsx:66`, `frontend/src/components/RecentSessions.jsx:69`~~
- ~~Risk: Incorrect session occupancy UI and empty/inaccurate recent-session query results.~~
- ~~Evidence: Query and UI checks reference singular `participant` field that does not exist in `Session` model.~~
- **FIXED**: Changed all references to use `participants` array and updated queries accordingly.

5. ~~Dashboard ignores group-session settings from modal.~~
- ~~Files: `frontend/src/components/CreateSessionModal.jsx:14`, `frontend/src/pages/DashboardPage.jsx:30`~~
- ~~Risk: User-selected `sessionType`/`maxParticipants` are dropped, so group mode does not behave as configured.~~
- ~~Evidence: `handleCreateRoom` only forwards `language`.~~
- **FIXED**: `handleCreateRoom` now forwards `language`, `sessionType`, and `maxParticipants` to the backend.

6. ~~Socket events are unauthenticated and trust client input.~~
- ~~File: `backend/src/server.js:41`, `backend/src/server.js:105`, `backend/src/server.js:122`, `backend/src/server.js:132`~~
- ~~Risk: Any client that knows a room ID can emit control events (toggle state, whiteboard/code updates, anti-cheat alerts).~~
- ~~Evidence: No auth middleware or user/session authorization checks on socket event handlers.~~
- **FIXED**: Added Clerk JWT authentication middleware to socket connections and session authorization checks before joining rooms.

## Medium

7. ~~Frontend lint errors/warnings currently fail quality gate.~~
- ~~Files: `frontend/src/components/WhiteboardPanel.jsx:4`, `frontend/src/pages/SessionPage.jsx:147`~~
- ~~Risk: CI/lint failures and potential stale state bugs.~~
- ~~Evidence: `npm run lint --prefix frontend` reports unused prop and missing hook dependency.~~
- **FIXED**: Removed unused `isHost` prop from WhiteboardPanel, added proper dependencies to useEffect hooks.

8. ~~Dead/no-op effect in `SessionPage`.~~
- ~~File: `frontend/src/pages/SessionPage.jsx:234`~~
- ~~Risk: Maintenance confusion and false confidence around role/session sync logic.~~
- ~~Evidence: Effect body exits immediately and performs no work.~~
- **FIXED**: Removed the dead useEffect and unused state variable.

9. ~~Debug logging remains in production paths.~~
- ~~Files: `frontend/src/components/Navbar.jsx:8`, `frontend/src/pages/SessionPage.jsx:126`~~
- ~~Risk: Noise in production logs and possible sensitive state leakage in browser console.~~
- **FIXED**: Removed console.log statements from Navbar.jsx and SessionPage.jsx.

10. Frontend bundle size is very large.
- Evidence from build: `frontend` output includes a JS chunk around 4.89 MB.
- Risk: Slow initial load and poor client performance on low-bandwidth devices.

11. ~~Input validation gaps around session creation/joining.~~
- ~~Files: `frontend/src/components/CreateSessionModal.jsx:70`, `backend/src/controllers/sessionController.js:6`~~
- ~~Risk: `NaN`/out-of-range participants and weak server-side guarantees.~~
- ~~Evidence: `parseInt` result is not guarded; backend does not clamp/validate allowed participant range.~~
- **FIXED**: Added validation for parseInt result in frontend and backend now validates/clamps participant range (2-20).

## Low

12. Minor naming/intent ambiguity in session model fields.
- File: `backend/src/models/Session.js:10`
- Risk: Future bugs from misunderstanding `code` field (access code vs editor content concept).
- Evidence: Field name `code` is used for access code while editor code is handled separately in client state.
