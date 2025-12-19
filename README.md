# Cloud Desk

**Cloud Desk** is a real-time collaborative coding platform designed to streamline technical interviews and pair programming sessions. It combines video conferencing, instant messaging, and a live code execution environment into a single, cohesive application.

## 🚀 Features

* **Collaborative Coding Sessions:** Create and join live coding sessions tailored to specific algorithm problems.
* **Real-time Communication:** Integrated video calling and chat functionality powered by **GetStream** (Stream Video & Chat SDKs).
* **Live Code Execution:** Write and run code in multiple languages (JavaScript, Python, Java) directly in the browser using the **Piston API**.
* **Problem Library:** Built-in collection of standard data structure and algorithm problems (e.g., Two Sum, Reverse String) with descriptions, examples, and test cases.
* **Authentication & User Management:** Secure sign-up and login via **Clerk**. User data is automatically synced to the database and Stream services.
* **Dashboard:** View active sessions, track recent history, and browse available coding problems.
* **Background Event Processing:** Uses **Inngest** to handle asynchronous events like user synchronization between Clerk and the internal database.

## 🛠️ Tech Stack

### Frontend
* **Framework:** React (Vite)
* **Styling:** TailwindCSS, DaisyUI
* **State Management:** React Query (`@tanstack/react-query`)
* **Code Editor:** `@monaco-editor/react`
* **Real-time/Media:** `@stream-io/video-react-sdk`, `stream-chat-react`
* **Routing:** React Router

### Backend
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB (via Mongoose)
* **Authentication:** Clerk (`@clerk/express`)
* **Event Driven:** Inngest (for webhooks and background jobs)
* **Video/Chat Backend:** Stream Node SDK

## 📂 Project Structure

The project is organized as a monorepo with distinct frontend and backend directories.

```text
root
├── backend/            # Express server and API logic
│   ├── src/
│   │   ├── controllers/  # Logic for chats and sessions
│   │   ├── lib/          # DB connection, Stream client, Inngest setup
│   │   ├── models/       # Mongoose schemas (User, Session)
│   │   ├── routes/       # API endpoints
│   │   └── server.js     # Entry point
│   └── package.json
│
├── frontend/           # React client application
│   ├── src/
│   │   ├── api/          # Axios setup
│   │   ├── components/   # UI Components (VideoCallUI, CodeEditor, etc.)
│   │   ├── data/         # Static problem definitions
│   │   ├── lib/          # Helper functions (Piston execution logic)
│   │   ├── pages/        # Route pages (Dashboard, ProblemPage, etc.)
│   │   └── App.jsx
│   └── package.json
│
└── package.json        # Root scripts for build automation