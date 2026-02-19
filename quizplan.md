# Quiz Feature Plan for Cloud Desk Sessions

Date: 2026-02-19
Status: Planning only (no feature code implemented in this step)

## 1. Goal and Scope

Add a **host-controlled quiz mode** inside live sessions so hosts can check participant understanding with timed multiple-choice questions.

Core requirements from product request:
- Host uploads a question bank file before or during session.
- If no file is available, host can compose a question manually in UI (question + 4 options + correct answer + timer).
- Host sees the full question list and starts any question as a round.
- Participants receive the active question in-session and submit one answer.
- Each round has a time limit.
- After round ends, show/update cumulative leaderboard (top 3 shown prominently).
- Leaderboard ranking should favor **correct + faster answers**.
- Keep leaderboard state until session ends.
- This is **QnA/knowledge check**, not open polling.

Non-goals for v1:
- Open-ended/free-text grading.
- AI-generated questions.
- Cross-session global rankings.

## 2. Proposed Product Workflow (End-to-End)

### 2.1 Host Flow
1. Host opens `SessionPage`.
2. Host opens `Quiz` panel (same area style as chat sidebar or bottom-right dock).
3. Host either:
   - uploads quiz file (`.json` in v1), or
   - creates a manual question in UI (prompt + exactly 4 options + correct option + timer).
4. System validates input and displays question list with metadata:
   - question text
   - options
   - correct option
   - round timer
   - optional explanation/tags
5. Host selects one question and clicks `Start Round`.
6. Live round starts for all participants (countdown visible).
7. After timer expiry (or manual end), results appear:
   - correct answer
   - participant correctness breakdown
   - round ranking by response speed
   - updated cumulative leaderboard
8. Host starts next question; repeat until session end.

### 2.2 Participant Flow
1. Participant joins session as usual.
2. When host starts a round, participant sees quiz card in quiz/chat area:
   - question
   - options
   - countdown
3. Participant submits one answer.
4. UI confirms submission and locks changes.
5. On round end, participant sees:
   - whether their answer was correct
   - their response time
   - current leaderboard.

### 2.3 Round Lifecycle
- `draft` (host has question bank loaded)
- `live` (active timer; participants can answer once)
- `closed` (no more answers accepted)
- `scored` (scores + leaderboard updated)

## 3. File Format Decision

## Chosen v1 format: JSON

Reason:
- Nested structure (question + options + correct + timer + explanation) is easy and explicit.
- Strong server-side validation with clear errors.
- Easier to evolve schema versioning.
- Avoids ambiguity from CSV column ordering and escaping issues.

### 3.1 v1 JSON Schema (practical)

```json
{
  "version": "1.0",
  "title": "Session 4 - Arrays",
  "defaultTimeLimitSec": 30,
  "questions": [
    {
      "id": "q1",
      "type": "single-choice",
      "prompt": "What is time complexity of binary search?",
      "options": ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
      "correctOptionIndex": 1,
      "timeLimitSec": 20,
      "explanation": "Binary search halves the search space each step."
    }
  ]
}
```

### 3.2 Validation Rules
- `questions.length` between 1 and 200 (configurable).
- `options.length` between 2 and 6.
- `correctOptionIndex` within options bounds.
- `prompt` non-empty, max length (for example 500 chars).
- `timeLimitSec` bounded (for example 10-120 seconds).
- Unique question IDs (or server assigns IDs if missing).

### 3.3 Future Extensions
- Add CSV/XLSX importer adapter that converts to this JSON schema.
- Optional support for industry formats (for example GIFT/QTI) as import pipelines, not runtime format.

### 3.4 Manual Authoring Mode (No File)
- Add host-side form in quiz panel:
  - `prompt` (required)
  - `optionA`, `optionB`, `optionC`, `optionD` (required; exactly 4 in v1)
  - `correctOptionIndex` (0-3)
  - `timeLimitSec` (bounded, e.g. 10-120)
  - optional `explanation`
- On save, this question is normalized to same internal JSON question shape and appended to `quizBank`.
- Host can launch it immediately or store it for later rounds in same session.

## 4. Architecture Plan (Cloud Desk Specific)

## 4.1 Frontend Architecture

Primary page:
- `frontend/src/pages/SessionPage.jsx`

New UI blocks:
- `QuizPanel.jsx` (host + participant views)
- `QuizHostControls.jsx` (upload, list, start/end)
- `QuizQuestionComposer.jsx` (manual add question form: prompt + 4 options + correct answer + timer)
- `QuizActiveRoundCard.jsx` (active question + timer + options)
- `QuizLeaderboard.jsx` (top 3 + full table optional)
- Optional: tab integration in `VideoCallUI.jsx` area (Chat | Quiz)

State model in SessionPage (React state + socket-driven):
- `quizBank`
- `activeRound`
- `mySubmission`
- `roundResult`
- `leaderboard`
- `quizStatus` (`idle|live|closed|scored`)

Data flow:
- Host actions emit socket events.
- Server is source of truth for live round timing, submissions, scoring.
- Clients receive synchronized updates and render accordingly.

## 4.2 Backend Architecture

Primary integration:
- Socket handlers in `backend/src/server.js` (same pattern as code/whiteboard sync)

Suggested persistence:
- Extend `Session` model (`backend/src/models/Session.js`) with quiz state fields:
  - `quizLeaderboard` (array of participant score objects)
  - `quizBankMeta` (title/version/count)
  - `quizHistory` (round summaries)
  - `activeQuizRound` (if a round is live)

In-memory cache for active rounds (like whiteboard map):
- `quizStateByRoom` map
- store active timer, accepted submissions, scoring interim state

Why hybrid (memory + DB):
- Low-latency round operations via memory.
- Crash/rejoin resilience via periodic DB snapshots.

## 4.3 Event Contract (Socket.IO)

Host -> Server:
- `quiz-upload` `{ roomId, quizJson }`
- `quiz-add-question` `{ roomId, question }`
- `quiz-start-round` `{ roomId, questionId }`
- `quiz-end-round` `{ roomId }` (manual end)

Participant -> Server:
- `quiz-submit-answer` `{ roomId, roundId, selectedOptionIndex, submittedAt }`

Server -> Clients:
- `quiz-bank-loaded` (host-targeted ack + validation summary)
- `quiz-round-started` `{ roundId, question, startedAt, endsAt }`
- `quiz-round-sync` (for late joiners/reconnect)
- `quiz-round-closed` `{ roundId, correctOptionIndex, stats }`
- `quiz-leaderboard-updated` `{ leaderboard, top3 }`
- `quiz-error` `{ message }`

## 4.4 Authorization and Integrity

- Only host can upload quiz and start/end rounds.
- Only host can add/edit/delete manual questions.
- Only host/participants of session can receive or submit.
- One answer per participant per round (first valid submission wins).
- Reject submissions after `endsAt`.
- Trust server time, not client time.
- Sanitize payload sizes to prevent abuse.

## 4.5 Scoring + Leaderboard Logic

Requirement: prioritize fast responses while still being QnA-focused.

Recommended scoring formula per round:
- incorrect/no answer: `0`
- correct answer: `basePoints + speedBonus`

Example:
- `basePoints = 100`
- `speedBonus = floor( max(0, (remainingMs / totalMs) * 100 ) )`
- round max = 200

Alternative (rank-based):
- among correct answers only:
  - 1st fastest = 150
  - 2nd = 130
  - 3rd = 115
  - others = 100

Leaderboard:
- cumulative score across rounds in current session
- tie-breakers in order:
  1. higher total correct count
  2. lower average response time on correct answers
  3. earlier last correct submission timestamp

Display:
- show top 3 podium after each round
- optionally expandable full ranking list.

## 4.6 Rejoin and Recovery

On reconnect or refresh:
- server emits current round status and remaining time (if live),
- participant sees if already submitted,
- current cumulative leaderboard restored from server.

On server restart:
- restore latest quiz snapshot from DB session document.

## 5. UX Recommendations

Placement options (both valid):
1. Reuse right sidebar with tabs: `Chat | Quiz` (recommended).
2. Dedicated bottom-right floating quiz drawer.

Host controls:
- Upload/replace question bank.
- Add question manually (without file).
- Start next question.
- End current round.
- Toggle showing explanation after round.

Participant experience:
- Very clear timer and submission state.
- Locked UI after answer.
- Brief feedback after round close.

Accessibility:
- high contrast timer state,
- keyboard option selection,
- no forced animations.

## 6. Industry Research (How EdTech Tools Implement Similar Features)

The following patterns are seen in major tools and should inform Cloud Desk design:

1. **Speed + correctness scoring is common**, but many platforms also offer accuracy-first mode.
   - Kahoot points are time-sensitive by default, with an accuracy mode option.
   - Quizizz supports timer-based scoring and timer-off mode.

2. **Timer modes matter** for pedagogy.
   - Platforms typically provide visible countdown and strict/non-strict timeout behavior.
   - For formative checks, accuracy-only mode reduces pressure.

3. **Live leaderboard boosts engagement**, but privacy/fairness controls are often needed.
   - Some tools support showing only top performers to reduce discouragement.

4. **Structured import templates** are widely used.
   - Kahoot uses spreadsheet templates for quiz import.
   - LMS ecosystems commonly use standardized formats (GIFT/QTI) for question portability.

5. **Instructor live monitoring dashboards** are common.
   - Teachers monitor who is struggling and class accuracy in real time.

### Source Links
- Kahoot points/scoring: https://support.kahoot.com/hc/en-us/articles/115002303908-How-points-work
- Kahoot accuracy mode: https://support.kahoot.com/hc/en-us/articles/39818967108627-How-to-host-kahoots-in-Accuracy-game-mode-NEW
- Kahoot spreadsheet import: https://support.kahoot.com/hc/en-us/articles/115002812547-How-to-import-questions-from-a-spreadsheet-to-your-kahoot
- Quizizz timer grading: https://support.quizizz.com/hc/en-us/articles/4408491293453-Grade-Questions-Using-Timer
- Quizizz live dashboard/accuracy: https://support.quizizz.com/hc/en-us/articles/21137312976281-Understand-How-Accuracy-Is-Measured-on-Quizizz
- Quizizz provide-support live monitoring: https://support.quizizz.com/hc/en-us/articles/46381786686745-Track-Student-Performance-Live-with-Provide-Support
- Top Hat live polling/autograding overview: https://tophat.com/features/inclass-engagement/
- Moodle GIFT format reference: https://docs.moodle.org/en/GIFT_format

## 7. Implementation Blueprint (No Code Yet)

Phase 1: Contracts + data model
- Define quiz JSON schema and server validation.
- Add session-level quiz state structures.
- Define socket event payload contracts.

Phase 2: Host upload + round orchestration
- Build host quiz upload panel and question list.
- Build manual question composer form.
- Implement `quiz-upload`, `quiz-add-question`, `quiz-start-round`.
- Broadcast active round to participants.

Phase 3: Participant answering + timing
- Implement answer submission with one-attempt rule.
- Timer close logic on server.
- Round result payload and correct-answer reveal.

Phase 4: Scoring + leaderboard
- Implement scoring function.
- Maintain cumulative session leaderboard.
- Show top 3 after each round and update all clients.

Phase 5: Reliability + security hardening
- Reconnect sync and late join handling.
- Persist quiz snapshots to DB.
- Add authz checks, payload bounds, anti-spam/rate limiting.

Phase 6: QA and acceptance
- Unit test scoring and tie-breakers.
- Integration test socket round lifecycle.
- Manual tests: host flow, participant flow, reconnect, full-room behavior.

## 8. Acceptance Criteria (Product)

- Host can upload valid question bank and see parse errors for invalid files.
- Host can create a valid manual question in UI without uploading any file.
- Host can start any selected question round.
- Participants see question and timer in real time.
- Each participant can submit only once per round.
- Server auto-closes round at timeout.
- Leaderboard updates after every round and persists until session ends.
- Top 3 displayed clearly after each round.
- Reconnect restores current round state and leaderboard.

## 9. Open Decisions to Confirm Before Build

1. Should host be included in answering/ranking, or only participants?
2. Should unanswered questions incur penalty or just zero?
3. Should leaderboard show full ranks to all, or top 3 only for participants?
4. Should we support only single-correct MCQ in v1 (recommended), then multi-correct later?
5. Should timer be fixed globally or configurable per question and overrideable by host at runtime?
