# Cloud Desk

Cloud Desk is a full-stack collaborative coding platform for interviews and pair-programming.
It combines:
- live video + chat (Stream),
- synchronized code editor (Monaco + Socket.IO),
- synchronized whiteboard (Excalidraw + Socket.IO),
- coding practice mode with code execution (Piston API).

## Monorepo Structure

```text
Cloud-Desk/
├── backend/      # Express + MongoDB + Socket.IO + Clerk + Stream
├── frontend/     # React (Vite) + Clerk + Stream UI + Monaco + Excalidraw
├── README.md
├── Project.md
├── ISSUES.md
├── TODO.md
└── NEXT.md
```

## Tech Stack

### Frontend
- React + Vite
- React Router
- TanStack Query
- Clerk (`@clerk/clerk-react`)
- Stream Video/Chat SDKs
- Monaco Editor
- Excalidraw
- TailwindCSS + DaisyUI

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO
- Clerk (`@clerk/express`)
- Stream Node SDK
- Inngest

## Current Features

- Create coding sessions (`one-on-one` and `group`).
- Join sessions using session id + access code.
- Host controls: end session, kick participant, toggle whiteboard/code space, anti-cheat mode.
- Real-time synchronization:
  - editor code + language,
  - whiteboard state + scene,
  - whiteboard/code-space visibility,
  - anti-cheat alerts.
- Session auto-completion when room becomes empty.
- Practice page with built-in problems and code execution.

## API Summary

Base path: `/api`

- `GET /health`
- `GET /chat/token`
- `POST /sessions`
- `GET /sessions/active`
- `GET /sessions/my-recent`
- `GET /sessions/:id`
- `POST /sessions/:id/join`
- `POST /sessions/:id/end`
- `POST /sessions/:id/kick`

## Socket Events

- Client -> server:
  - `join-session`
  - `code-change`
  - `language-change`
  - `whiteboard-change`
  - `toggle-whiteboard`
  - `toggle-code-space`
  - `toggle-anti-cheat`
  - `cheat-detected`
- Server -> client:
  - `code-update`
  - `language-update`
  - `whiteboard-sync`
  - `whiteboard-update`
  - `whiteboard-state`
  - `code-space-state`
  - `anti-cheat-update`
  - `cheat-alert`

## Local Development

1. Install dependencies:
```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

2. Start backend:
```bash
npm run dev --prefix backend
```

3. Start frontend:
```bash
npm run dev --prefix frontend
```

4. Quality checks:
```bash
npm run lint --prefix frontend
npm run build --prefix frontend
```

## Status (2026-02-18)

- Whiteboard free-draw persistence bug is fixed.
- Frontend lint/build pass.
- Remaining engineering risks are tracked in `ISSUES.md` and `TODO.md`.
