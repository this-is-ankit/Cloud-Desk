# Codebase Issues Audit

Date: 2026-02-18
Scope: Current `backend/src` and `frontend/src` behavior after whiteboard fix.

## Critical

1. `GET /api/sessions/:id` leaks session access code to any authenticated user.
- Files: `backend/src/controllers/sessionController.js`
- Risk: Access code protection is effectively bypassed if caller can fetch session by id.
- Recommendation: Do not return `code` for non-host users (or return via host-only endpoint).

2. Socket host controls can be triggered by non-host participants.
- Files: `backend/src/server.js`
- Affected events: `toggle-code-space`, `toggle-anti-cheat`.
- Risk: Participants can change host-only controls.
- Recommendation: enforce host authorization in these handlers (same pattern already used in `toggle-whiteboard`).

## High

3. `join-session-guest` bypasses session authorization semantics.
- Files: `backend/src/server.js`
- Risk: Any authenticated socket can join arbitrary room ids via guest path if frontend ever uses/exposes it.
- Recommendation: remove the guest event or enforce explicit authorization constraints.

4. Stream token response uses wrong image field.
- Files: `backend/src/controllers/chatController.js`
- Evidence: returns `req.user.image` while user model stores `profileImage`.
- Risk: missing avatar identity consistency and potential downstream UI assumptions.

## Medium

5. Large frontend bundle output.
- Evidence: build produces multi-megabyte chunks.
- Risk: slower initial load and weaker UX on constrained networks/devices.
- Recommendation: route-based code-splitting and heavy-module lazy loading.

6. Socket handlers have limited explicit error-path telemetry.
- Files: `backend/src/server.js`
- Risk: production debugging is slower when real-time persistence fails.
- Recommendation: structured logs around persistence failures and authorization denials.

## Resolved Recently

- Whiteboard free-draw persistence issue in new sessions.
- Excalidraw geometry corruption from custom freedraw bounds rewriting.
- Stale whiteboard update overwrite race (server merge + sender echo handling).
