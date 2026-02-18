# TODO

Date: 2026-02-18

## P0

- [ ] Hide session access code from non-host users in `GET /sessions/:id` response.
- [ ] Enforce host-only authorization for `toggle-code-space` socket event.
- [ ] Enforce host-only authorization for `toggle-anti-cheat` socket event.
- [ ] Remove or lock down `join-session-guest` socket event.

## P1

- [ ] Fix chat token payload to use `profileImage` in `chatController`.
- [ ] Add socket-level structured logs for denied events and persistence failures.
- [ ] Add integration test coverage for host/participant authorization boundaries.

## P2

- [ ] Split large frontend bundles (lazy load heavy pages/components).
- [ ] Add smoke tests for whiteboard roundtrip on fresh session creation.
- [ ] Add CI workflow for frontend lint/build and backend checks.

## P3

- [ ] Add API response DTO shaping to avoid leaking internal fields by default.
- [ ] Add runtime metrics for socket room state and event throughput.
