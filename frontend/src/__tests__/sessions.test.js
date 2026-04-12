import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the axios instance before importing the module under test
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("../lib/axios", () => ({
  default: {
    get: mockGet,
    post: mockPost,
  },
}));

const { sessionApi } = await import("../api/sessions.js");

describe("sessionApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSession", () => {
    it("POSTs to /sessions with provided data", async () => {
      const payload = { language: "javascript", sessionType: "one-on-one" };
      const responseData = { session: { _id: "s1", ...payload } };
      mockPost.mockResolvedValue({ data: responseData });

      const result = await sessionApi.createSession(payload);

      expect(mockPost).toHaveBeenCalledWith("/sessions", payload);
      expect(result).toEqual(responseData);
    });

    it("propagates errors from the API", async () => {
      mockPost.mockRejectedValue(new Error("Network error"));
      await expect(sessionApi.createSession({})).rejects.toThrow("Network error");
    });
  });

  describe("getActiveSessions", () => {
    it("GETs /sessions/active", async () => {
      const responseData = { sessions: [] };
      mockGet.mockResolvedValue({ data: responseData });

      const result = await sessionApi.getActiveSessions();

      expect(mockGet).toHaveBeenCalledWith("/sessions/active");
      expect(result).toEqual(responseData);
    });
  });

  describe("getMyRecentSessions", () => {
    it("GETs /sessions/my-recent", async () => {
      const responseData = { sessions: [] };
      mockGet.mockResolvedValue({ data: responseData });

      const result = await sessionApi.getMyRecentSessions();

      expect(mockGet).toHaveBeenCalledWith("/sessions/my-recent");
      expect(result).toEqual(responseData);
    });
  });

  describe("getSessionById", () => {
    it("GETs /sessions/:id with correct id", async () => {
      const responseData = { session: { _id: "abc" } };
      mockGet.mockResolvedValue({ data: responseData });

      const result = await sessionApi.getSessionById("abc");

      expect(mockGet).toHaveBeenCalledWith("/sessions/abc");
      expect(result).toEqual(responseData);
    });

    it("uses the id verbatim in the URL", async () => {
      mockGet.mockResolvedValue({ data: {} });

      await sessionApi.getSessionById("session-xyz-123");

      expect(mockGet).toHaveBeenCalledWith("/sessions/session-xyz-123");
    });
  });

  describe("joinSessionByCode", () => {
    it("POSTs to /sessions/join-by-code with the code", async () => {
      const responseData = { session: {}, sessionId: "s1" };
      mockPost.mockResolvedValue({ data: responseData });

      const result = await sessionApi.joinSessionByCode("ABC123");

      expect(mockPost).toHaveBeenCalledWith("/sessions/join-by-code", {
        code: "ABC123",
      });
      expect(result).toEqual(responseData);
    });
  });

  describe("joinSession", () => {
    it("POSTs to /sessions/:id/join with id and code", async () => {
      const responseData = { session: { _id: "s2" } };
      mockPost.mockResolvedValue({ data: responseData });

      const result = await sessionApi.joinSession({ id: "s2", code: "XYZ" });

      expect(mockPost).toHaveBeenCalledWith("/sessions/s2/join", {
        code: "XYZ",
      });
      expect(result).toEqual(responseData);
    });

    it("uses the session id in the path", async () => {
      mockPost.mockResolvedValue({ data: {} });

      await sessionApi.joinSession({ id: "session-99", code: "MYCODE" });

      expect(mockPost).toHaveBeenCalledWith("/sessions/session-99/join", {
        code: "MYCODE",
      });
    });
  });

  describe("kickParticipant", () => {
    it("POSTs to /sessions/:sessionId/kick with participantId in body", async () => {
      const responseData = { message: "kicked" };
      mockPost.mockResolvedValue({ data: responseData });

      const result = await sessionApi.kickParticipant({
        sessionId: "sess-1",
        participantId: "part-2",
      });

      expect(mockPost).toHaveBeenCalledWith("/sessions/sess-1/kick", {
        participantId: "part-2",
      });
      expect(result).toEqual(responseData);
    });

    it("sends participantId in request body (not URL param)", async () => {
      mockPost.mockResolvedValue({ data: {} });

      await sessionApi.kickParticipant({
        sessionId: "s1",
        participantId: "p99",
      });

      // The fix from the PR: participantId is in the body, not just the id in the URL
      const [url, body] = mockPost.mock.calls[0];
      expect(url).toBe("/sessions/s1/kick");
      expect(body).toEqual({ participantId: "p99" });
    });
  });

  describe("endSession", () => {
    it("POSTs to /sessions/:id/end", async () => {
      const responseData = { message: "ended" };
      mockPost.mockResolvedValue({ data: responseData });

      const result = await sessionApi.endSession("sess-123");

      expect(mockPost).toHaveBeenCalledWith("/sessions/sess-123/end");
      expect(result).toEqual(responseData);
    });
  });

  describe("startLivestream", () => {
    it("POSTs to /sessions/:id/livestream/start", async () => {
      mockPost.mockResolvedValue({ data: { session: {} } });

      await sessionApi.startLivestream("live-session-1");

      expect(mockPost).toHaveBeenCalledWith(
        "/sessions/live-session-1/livestream/start",
      );
    });
  });

  describe("stopLivestream", () => {
    it("POSTs to /sessions/:id/livestream/stop", async () => {
      mockPost.mockResolvedValue({ data: { session: {} } });

      await sessionApi.stopLivestream("live-session-1");

      expect(mockPost).toHaveBeenCalledWith(
        "/sessions/live-session-1/livestream/stop",
      );
    });
  });

  describe("getStreamToken", () => {
    it("GETs /chat/token", async () => {
      const responseData = { token: "tok123" };
      mockGet.mockResolvedValue({ data: responseData });

      const result = await sessionApi.getStreamToken();

      expect(mockGet).toHaveBeenCalledWith("/chat/token");
      expect(result).toEqual(responseData);
    });
  });
});