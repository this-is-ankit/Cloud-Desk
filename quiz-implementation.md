# Quiz Feature Implementation Checklist (Coding Work)

Date: 2026-02-19
Purpose: Concrete engineering tasks required to build the session quiz feature smoothly.

## 1. Backend: Data Model and Persistence

- Update `backend/src/models/Session.js` with quiz fields:
  - `quizBank` (array of normalized questions)
  - `quizLeaderboard` (cumulative participant scores)
  - `quizHistory` (completed round summaries)
  - `activeQuizRound` (live round snapshot, nullable)
  - `quizSettings` (default timer, scoring mode if needed)
- Add schema constraints/defaults to avoid malformed data.
- Add migration-safe defaults so old sessions still work.

## 2. Backend: Validation Layer

- Add centralized validator for uploaded/manual questions:
  - required prompt
  - exactly 4 non-empty options (v1)
  - valid `correctOptionIndex`
  - bounded `timeLimitSec`
  - max question count and max text length
- Normalize all questions to internal shape:
  - generated/stable `id`
  - sanitized strings
  - server-trusted timer values
- Return structured validation errors to host UI.

## 3. Backend: Quiz Runtime State

- Add in-memory cache map in `backend/src/server.js`:
  - `quizStateByRoom`
  - active round timer handle
  - round submissions map
- Keep server as source of truth for:
  - round start/end timestamps
  - answer acceptance window
  - scoring
- Persist important checkpoints to MongoDB:
  - on question bank changes
  - on round close
  - on leaderboard update

## 4. Backend: Socket Events

- Implement host events:
  - `quiz-upload`
  - `quiz-add-question`
  - `quiz-start-round`
  - `quiz-end-round`
- Implement participant event:
  - `quiz-submit-answer`
- Implement broadcast events:
  - `quiz-bank-loaded`
  - `quiz-round-started`
  - `quiz-round-sync`
  - `quiz-round-closed`
  - `quiz-leaderboard-updated`
  - `quiz-error`
- Enforce authorization checks for every event:
  - host-only actions
  - session member-only actions

## 5. Backend: Round Engine

- Build round lifecycle state machine:
  - `idle -> live -> closed -> scored`
- Timer control:
  - auto-close round when time expires
  - manual early close by host
- Submission rules:
  - one submission per participant per round
  - reject late submissions
  - reject duplicate submissions
- Result generation:
  - correctness per participant
  - response time calculation from server clock

## 6. Backend: Scoring and Leaderboard

- Implement scoring utility:
  - only correct answers get points
  - speed bonus from remaining time
- Maintain cumulative leaderboard for session.
- Tie-breakers:
  - total correct answers
  - average correct response time
  - earliest latest-correct timestamp
- Expose top 3 and full ranking payloads cleanly.

## 7. Frontend: Session UI Integration

- Extend `frontend/src/pages/SessionPage.jsx` with quiz state:
  - question bank
  - active round
  - submission status
  - round results
  - leaderboard
- Add UI container (chat-tab style or bottom-right panel).
- Add host controls:
  - upload `.json`
  - manual question composer
  - question picker
  - start/end round buttons
- Add participant view:
  - active question card
  - option selection
  - countdown
  - lock state after submit
  - round feedback and leaderboard

## 8. Frontend: New Components

- `QuizPanel.jsx`
- `QuizHostControls.jsx`
- `QuizQuestionComposer.jsx`
- `QuizActiveRoundCard.jsx`
- `QuizLeaderboard.jsx`
- Keep components controlled via socket-synced props from `SessionPage`.

## 9. Frontend: File Upload and Parsing

- Add `.json` upload input for host.
- Parse file safely on client (basic checks), but rely on backend for final validation.
- Show row/question-level parse errors in a readable way.
- Append valid manual questions and uploaded questions into same host list.

## 10. Frontend: Socket Wiring

- Subscribe/unsubscribe to all quiz socket events cleanly in `SessionPage`.
- Handle reconnect:
  - request/receive `quiz-round-sync`
  - recover countdown and submission state
- Prevent stale UI state when session changes or user role changes.

## 11. Security and Abuse Controls

- Payload size limits for upload/manual question content.
- Server-side rate limiting for answer submissions.
- Guard against host double-starting two rounds simultaneously.
- Never trust client timestamps for scoring.

## 12. Testing Requirements

- Unit tests:
  - question validator
  - scoring logic
  - tie-breakers
  - round state transitions
- Integration/socket tests:
  - host start flow
  - participant submit flow
  - timeout close flow
  - reconnect sync
  - unauthorized event rejection
- Manual QA:
  - host-only control visibility
  - participant one-submit rule
  - leaderboard updates after each round
  - session end cleanup

## 13. Performance and Reliability

- Ensure timers are server-managed and lightweight.
- Minimize emitted payload size (avoid sending full history every event).
- Snapshot leaderboard/round state in DB at safe checkpoints.
- Clean in-memory quiz state when session ends.

## 14. Suggested Build Order

1. Data model + validator + scoring utilities.
2. Socket contracts + round engine on backend.
3. Host UI (upload + manual composer + start round).
4. Participant UI (answering + timer + feedback).
5. Leaderboard + persistence + reconnect sync.
6. Tests + QA pass + docs update.

## 15. Done Criteria

- Host can run quiz using either uploaded JSON or manual question entry.
- Participants receive synchronized timed questions and can answer once.
- Round closes correctly on timeout/manual end.
- Leaderboard is updated and preserved through session.
- Reconnect restores active round state and rankings.
- Feature passes defined tests and manual QA scenarios.

