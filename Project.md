# Cloud Desk Project Guide

## Overview

Cloud Desk is a full-stack collaborative coding platform for technical interviews and pair programming.  
It combines:
- realtime video calls,
- realtime chat,
- shared coding session state (language/code/whiteboard/events),
- a standalone problem-solving workspace with code execution.

The repository is a monorepo with separate frontend and backend applications.

## Repository Structure

```text
Cloud-Desk/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── data/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── README.md
├── ISSUES.md
└── TODO.md
```

## Tech Stack

### Frontend
- React (Vite)
- React Router
- TanStack Query
- Clerk React SDK (auth)
- Stream Video + Stream Chat React SDKs
- Monaco Editor
- Excalidraw
- Tailwind CSS + DaisyUI

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Clerk Express middleware
- Stream Node SDK + Stream Chat server SDK
- Socket.IO
- Inngest (event functions / webhook-style workflows)

## High-Level Architecture

### 1. Auth and User Sync
- Frontend authenticates users with Clerk.
- Backend protects API routes with `protectRoute` middleware.
- Middleware resolves the Clerk user and ensures a matching MongoDB user exists.
- User sync with Stream is handled in two places:
  - Inngest functions on Clerk user created/deleted events.
  - Fallback sync in `protectRoute` if user is missing in DB.

### 2. Session Lifecycle
- Host creates session via `POST /api/sessions`.
- Backend creates:
  - MongoDB session document,
  - Stream Video call,
  - Stream Chat channel.
- Participants join via access code and session ID.
- Host can kick participants and end session.
- Session status transitions from `active` to `completed`.

### 3. Realtime Collaboration
- Socket.IO room key is session ID.
- Realtime events include:
  - code changes,
  - language changes,
  - whiteboard changes and visibility state,
  - code-space visibility state,
  - anti-cheat toggles and alerts.

### 4. Coding Practice Mode
- Separate from live sessions: `/problem/:id`.
- Loads static problems from `frontend/src/data/problems.js`.
- Executes code through Piston API client in `frontend/src/lib/piston.js`.
- Compares output against expected values and shows pass/fail feedback.

## Backend Walkthrough

### Entry Point
- `backend/src/server.js`
  - Initializes Express, CORS, Clerk middleware, Socket.IO.
  - Registers routes:
    - `/api/chat`
    - `/api/sessions`
    - `/api/inngest`
  - Exposes `/health`.
  - In production, serves frontend build output.

### Core Libraries
- `backend/src/lib/env.js`: environment variable mapping.
- `backend/src/lib/db.js`: MongoDB connection bootstrap.
- `backend/src/lib/stream.js`: Stream clients + user upsert/delete helpers.
- `backend/src/lib/inngest.js`: Inngest client and user sync functions.

### Data Models
- `backend/src/models/User.js`
  - `name`, `email`, `profileImage`, `clerkId`.
- `backend/src/models/Session.js`
  - session metadata (`language`, `host`, `participants`, `status`, `sessionType`, `maxParticipants`, etc.)
  - access code and call/channel linkage.

### Controllers
- `sessionController.js`
  - create/join/get/end/kick session operations.
- `chatController.js`
  - Stream token generation for authenticated user.

### Middleware
- `protectRoute.js`
  - Requires auth.
  - Attaches hydrated DB user as `req.user`.

## Frontend Walkthrough

### App Shell
- `frontend/src/main.jsx`
  - Wraps app with BrowserRouter, QueryClientProvider, ClerkProvider.
- `frontend/src/App.jsx`
  - Route-level auth gating.

### API + Data Access
- `frontend/src/lib/axios.js`: Axios instance with API base URL.
- `frontend/src/api/sessions.js`: session/chat API calls.
- `frontend/src/hooks/useSessions.js`: React Query hooks for CRUD flows.

### Realtime + Stream Hooks
- `frontend/src/hooks/useStreamClient.js`
  - Initializes Stream Video and Stream Chat clients.
  - Joins/leaves calls/channels and handles cleanup.

### Main Pages
- `HomePage.jsx`: marketing/entry page.
- `DashboardPage.jsx`: create session, view active sessions/history.
- `SessionPage.jsx`: primary live collaboration screen.
- `ProblemsPage.jsx`: problem list.
- `ProblemPage.jsx`: coding practice environment.

### Key Components
- `VideoCallUI.jsx`: Stream call UI + integrated chat.
- `CodeEditorPanel.jsx`: Monaco editor + run button.
- `OutputPanel.jsx`: execution result rendering.
- `WhiteboardPanel.jsx`: Excalidraw collaborative whiteboard.
- Dashboard cards/lists: active/recent sessions and stats.

## Environment and Configuration

### Required Environment Variables (summary)

Backend typically needs:
- `PORT`
- `NODE_ENV`
- `DB_URL`
- `CLIENT_URL`
- `CLERK_SECRET_KEY`
- `STREAM_API_KEY`
- `STREAM_API_SECRET`
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`

Frontend typically needs:
- `VITE_API_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_STREAM_API_KEY`

Use local `.env` files for development. Do not commit real credentials.

## Local Development

### Install
- Root: `npm install`
- Backend: `npm install --prefix backend`
- Frontend: `npm install --prefix frontend`

### Run
- Backend: `npm run dev --prefix backend`
- Frontend: `npm run dev --prefix frontend`

### Build
- Frontend build: `npm run build --prefix frontend`
- Root convenience build: `npm run build`

### Lint
- Frontend: `npm run lint --prefix frontend`

## API Surface (current)

### Session routes (`/api/sessions`)
- `POST /` create session
- `GET /active` list active sessions
- `GET /my-recent` list completed sessions for current user
- `GET /:id` get one session
- `POST /:id/join` join with access code
- `POST /:id/end` end session (host)
- `POST /:id/kick` kick participant (host)

### Chat route (`/api/chat`)
- `GET /token` Stream auth token for current user

## Known Gaps

Current issues and remediation backlog are already documented in:
- `ISSUES.md`
- `TODO.md`

Recommended onboarding order for a new contributor:
1. Read this file (`Project.md`).
2. Read `ISSUES.md` and `TODO.md`.
3. Start with P0 fixes (security + broken session flows).
