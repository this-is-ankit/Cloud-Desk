# Cloud Desk Project Guide

## Overview

Cloud Desk is a collaborative interview workspace with synchronized code, whiteboard, video, and chat.

The architecture has two realtime layers:
- Stream: media + chat transport.
- Socket.IO: session state sync (editor, whiteboard, UI toggles, anti-cheat signals).

## Runtime Architecture

### Backend (`backend/src`)

- `server.js`
  - Express app + Socket.IO server.
  - Clerk socket token verification.
  - Session room join authorization.
  - Whiteboard in-memory cache + DB persistence.
  - Session auto-end when room empties.
- `controllers/sessionController.js`
  - Session CRUD-like lifecycle (create/join/end/kick/list/get).
- `controllers/chatController.js`
  - Stream chat/video token endpoint.
- `middleware/protectRoute.js`
  - API auth and lazy user provisioning into MongoDB + Stream.
- `models/Session.js`, `models/User.js`
  - Session + user persistence models.

### Frontend (`frontend/src`)

- `pages/SessionPage.jsx`
  - Main live session orchestration.
  - Socket wiring and panel state.
- `components/WhiteboardPanel.jsx`
  - Excalidraw host component.
  - Sanitization + remote update application safeguards.
- `hooks/useStreamClient.js`
  - Stream client and call/channel join lifecycle.
- `components/CodeEditorPanel.jsx`, `OutputPanel.jsx`
  - Realtime coding and execution UI.
- `pages/ProblemPage.jsx`
  - standalone coding practice with test output validation.

## Data Model Notes

`Session` stores:
- host/participants,
- session type/capacity,
- access code,
- Stream call/channel identifiers,
- toggles (`isCodeOpen`, `isAntiCheatEnabled`, `whiteboardIsOpen`),
- persisted whiteboard scene (`whiteboardElements`, `whiteboardAppState`).

## Whiteboard Implementation Notes

- Whiteboard scene is synchronized over Socket.IO using full-scene payloads.
- Server sanitizes elements and persists merged scene to MongoDB.
- Version-aware server merging is used to prevent stale event overwrite.
- Client ignores its own echoed scene updates to reduce draw-loop conflicts.

## Verified Checks (2026-02-18)

- `npm run lint --prefix frontend`: pass
- `npm run build --prefix frontend`: pass
- backend syntax check: pass

## Known Gaps

See:
- `ISSUES.md` for current risks and defects.
- `TODO.md` for implementation backlog.
- `NEXT.md` for near-term execution order.
