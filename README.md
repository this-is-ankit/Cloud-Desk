# Cloud Desk ☁️💻

Cloud Desk is a smart, real-time technical learning platform for live teaching, collaborative coding, and guided practice.

It combines video calls, chat, shared coding, whiteboard collaboration, quiz rounds, and coding practice into one workspace.

## What The Platform Supports 🚀

- Live instructor-led sessions with participant controls (one-on-one or group) 👩‍🏫👨‍🏫
- Real-time code collaboration with synchronized language and editor state 🔄
- Built-in code execution for JavaScript, Python, Java, C++, C, Rust, and Go 🧠
- Interactive whiteboard (Excalidraw) with persistence across reconnects 🧾
- Timed quiz rounds with host controls, live answer submission, and leaderboard scoring 🏆
- Session anti-cheat monitoring (tab switch/window blur alerts) 🛡️
- Access-code-based participant joining 🔐
- Problem practice mode with expected-output checks and pass/fail feedback ✅
- Session lifecycle management: create, join, kick, end, and recent history 🗂️

## Product Positioning 🎯

Cloud Desk now aligns best with an interactive online education model:

- Teacher/mentor creates a live coding classroom
- Learners join securely with session code
- Class runs with video + chat + coding + whiteboard + quizzes in sync
- Learners can continue with self-practice problems outside live sessions

## Tech Stack 🧱

### Frontend 🎨

- React (Vite)
- React Router
- TanStack Query
- Clerk React SDK
- Stream Video + Stream Chat SDKs
- Monaco Editor
- Excalidraw
- Tailwind CSS + DaisyUI

### Backend ⚙️

- Node.js + Express
- MongoDB + Mongoose
- Clerk Express middleware
- Stream Node SDK + Stream Chat SDK
- Socket.IO
- Inngest

## Monorepo Structure 🗃️

```text
Cloud-Desk/
|- backend/
|  |- src/
|  |  |- controllers/
|  |  |- lib/
|  |  |- middleware/
|  |  |- models/
|  |  |- routes/
|  |  '- server.js
|  '- package.json
|- frontend/
|  |- src/
|  |  |- api/
|  |  |- components/
|  |  |- data/
|  |  |- hooks/
|  |  |- lib/
|  |  |- pages/
|  |  |- App.jsx
|  |  '- main.jsx
|  '- package.json
'- README.md
```

## Environment Variables 🔧

### Backend (`backend/.env`) 🖥️

```env
PORT=3000
NODE_ENV=development
DB_URL=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173

CLERK_SECRET_KEY=your_clerk_secret
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret

INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key

# Optional code execution providers
PISTON_API_URL=http://localhost:2000/api/v2/piston/execute
JUDGE0_API_URL=https://ce.judge0.com
JUDGE0_AUTH_TOKEN=
```

### Frontend (`frontend/.env`) 🌐

```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_API_URL=http://localhost:3000/api
VITE_STREAM_API_KEY=your_stream_api_key
```

## Local Development 🛠️

Install dependencies 📦:

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

Run apps ▶️:

```bash
npm run dev --prefix backend
npm run dev --prefix frontend
```

Build frontend 🏗️:

```bash
npm run build --prefix frontend
```

Root convenience scripts 🧪:

```bash
npm run build
npm run start
```

## API Endpoints 🔌

### Session APIs 📚

- `POST /api/sessions` create session
- `GET /api/sessions/active` list active sessions
- `GET /api/sessions/my-recent` list current user's completed sessions
- `GET /api/sessions/:id` get session details
- `POST /api/sessions/:id/join` join with access code
- `POST /api/sessions/:id/kick` kick participant (host)
- `POST /api/sessions/:id/end` end session (host)

### Chat API 💬

- `GET /api/chat/token` Stream token for authenticated user

### Code Execution API ▶️

- `POST /api/code/execute` execute code via configured runtime backend

## Realtime Events (Socket.IO) ⚡

- Collaboration: `code-change`, `language-change`, `code-space-state` 👥
- Whiteboard: `whiteboard-change`, `whiteboard-update`, `whiteboard-state`, `whiteboard-sync` 🧑‍🎨
- Quiz: `quiz-upload`, `quiz-add-question`, `quiz-start-round`, `quiz-submit-answer`, `quiz-round-started`, `quiz-round-closed`, `quiz-leaderboard-updated` 📝
- Monitoring: `toggle-anti-cheat`, `cheat-detected`, `cheat-alert` 🚨

## Notes 📝

- Authentication is enforced with Clerk on API routes and socket connections.
- Stream is used for production-grade video and chat.
- Session and whiteboard/quiz state are persisted in MongoDB.
- Do not commit real `.env` secrets.
