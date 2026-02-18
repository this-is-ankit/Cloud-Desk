# NEXT

Date: 2026-02-18

## Immediate Execution Order

1. Session access control hardening
- Remove `code` leakage from `GET /sessions/:id` for non-host users.

2. Socket authorization hardening
- Add host checks for `toggle-code-space` and `toggle-anti-cheat`.
- Remove or secure `join-session-guest`.

3. Contract cleanup
- Correct `chatController` response image mapping (`profileImage`).

4. Regression protection
- Add whiteboard realtime regression test for:
  - fresh session creation,
  - initial free-draw stroke persistence,
  - server restart with active session.

5. Performance follow-up
- Begin frontend chunk splitting plan for large build output.

## Notes

The previous whiteboard persistence blocker is resolved. This file now tracks the next engineering priorities, focused on access control and hardening.
