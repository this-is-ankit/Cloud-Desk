# TODO

Date: 2026-02-16
Priority legend: P0 (urgent), P1 (high), P2 (normal), P3 (nice-to-have)

## P0

- [ ] Remove all committed secrets and rotate exposed credentials.
- [ ] Add `.env` and environment examples (`.env.example`) only; never commit real keys.
- [ ] Enforce `maxParticipants` before adding participant.
- [ ] Add participant only once.
- [ ] Always sync Stream channel membership when join succeeds.
- [ ] Update `frontend/src/api/sessions.js` `kickParticipant` to accept `{ sessionId, participantId }`.
- [ ] Send `participantId` in request body.
- [ ] Keep `frontend/src/pages/SessionPage.jsx` mutation payload and backend controller aligned.

## P1

- [ ] Replace all `participant` field references with `participants` where appropriate.
- [ ] Fix `getMyRecentSessions` query in `backend/src/controllers/sessionController.js` to use `participants`.
- [ ] `frontend/src/pages/DashboardPage.jsx`
- [ ] `frontend/src/components/ActiveSessions.jsx`
- [ ] `frontend/src/components/RecentSessions.jsx`
- [ ] Include `sessionType` and `maxParticipants` in create payload.
- [ ] Add backend validation for `sessionType` and participant range.
- [ ] Associate socket user identity.
- [ ] Validate user is host/participant before accepting state-changing events.

## P2

- [ ] Remove unused `isHost` prop in `frontend/src/components/WhiteboardPanel.jsx` (or use it).
- [ ] Resolve hook dependency warning in `frontend/src/pages/SessionPage.jsx`.
- [ ] Remove dead/no-op `useEffect` in `frontend/src/pages/SessionPage.jsx`.
- [ ] Remove debug `console.log` statements from UI components.
- [ ] Guard numeric parsing in create modal (`NaN` fallback and min/max clamp).
- [ ] create/join with access code
- [ ] full-room rejection
- [ ] kick participant
- [ ] end session and stream cleanup

## P3

- [ ] Reduce frontend bundle size via route/component code splitting.
- [ ] Consider clearer naming for access code field in session model to reduce confusion.
- [ ] Add CI workflow for lint + build + backend tests.
