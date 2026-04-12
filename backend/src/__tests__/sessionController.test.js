import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// ─── mock all external dependencies ────────────────────────────────────────

const mockSessionFindById = jest.fn();
const mockSessionFindOne = jest.fn();
const mockSessionFind = jest.fn();
const mockSessionCreate = jest.fn();
const mockSessionSave = jest.fn();

jest.unstable_mockModule("../models/Session.js", () => ({
  default: {
    findById: mockSessionFindById,
    findOne: mockSessionFindOne,
    find: mockSessionFind,
    create: mockSessionCreate,
  },
}));

const mockCourseFindById = jest.fn();
jest.unstable_mockModule("../models/Course.js", () => ({
  default: {
    findById: mockCourseFindById,
  },
}));

const mockChatChannel = jest.fn();
const mockStreamVideoCall = jest.fn();
jest.unstable_mockModule("../lib/stream.js", () => ({
  chatClient: { channel: mockChatChannel },
  streamClient: { video: { call: mockStreamVideoCall } },
}));

const mockWhiteboardStateByRoom = new Map();
const mockWhiteboardPersistTimersByRoom = new Map();
const mockQuizStateByRoom = new Map();
jest.unstable_mockModule("../server.js", () => ({
  whiteboardStateByRoom: mockWhiteboardStateByRoom,
  whiteboardPersistTimersByRoom: mockWhiteboardPersistTimersByRoom,
  quizStateByRoom: mockQuizStateByRoom,
}));

const mockSaveCourseWithRepair = jest.fn();
jest.unstable_mockModule("../lib/coursePersistence.js", () => ({
  saveCourseWithRepair: mockSaveCourseWithRepair,
}));

jest.unstable_mockModule("../lib/sessionLanguage.js", () => ({
  getNormalizedSessionLanguage: (val) => {
    const map = {
      javascript: "javascript",
      python: "python",
      java: "java",
      js: "javascript",
    };
    return map[val] || null;
  },
  getSessionLanguageLabel: (val) => {
    const map = {
      javascript: "JavaScript",
      python: "Python",
    };
    return map[val] || "JavaScript";
  },
}));

const {
  createSession,
  getActiveSessions,
  getMyRecentSessions,
  getSessionById,
  joinSession,
  kickParticipant,
  endSession,
} = await import("../controllers/sessionController.js");

// ─── test helpers ───────────────────────────────────────────────────────────

const makeRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

const makeUser = (overrides = {}) => ({
  _id: { toString: () => "user-123" },
  clerkId: "clerk-user-123",
  role: "student",
  ...overrides,
});

const makeSession = (overrides = {}) => ({
  _id: { toString: () => "session-456" },
  host: { toString: () => "user-123" },
  hostId: { toString: () => "user-123" },
  callId: "call-abc",
  code: "ABC123",
  status: "active",
  sessionType: "interactive",
  maxParticipants: 10,
  participants: [],
  courseId: null,
  save: mockSessionSave,
  ...overrides,
});

// ─── createSession ──────────────────────────────────────────────────────────

describe("createSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWhiteboardStateByRoom.clear();
    mockWhiteboardPersistTimersByRoom.clear();
    mockQuizStateByRoom.clear();
  });

  it("returns 400 when language is not supported", async () => {
    const req = {
      body: { language: "ruby", sessionType: "one-on-one" },
      user: makeUser(),
    };
    const res = makeRes();

    await createSession(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Choose a supported coding language",
    });
  });

  it("returns 400 when language is missing", async () => {
    const req = {
      body: { sessionType: "one-on-one" },
      user: makeUser(),
    };
    const res = makeRes();

    await createSession(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("uses participant limit of 1 for one-on-one sessions", async () => {
    const createdSession = makeSession({
      language: "javascript",
      maxParticipants: 1,
    });
    mockSessionCreate.mockResolvedValue(createdSession);

    const mockCall = { getOrCreate: jest.fn().mockResolvedValue(undefined) };
    mockStreamVideoCall.mockReturnValue(mockCall);

    const mockChannel = {
      create: jest.fn().mockResolvedValue(undefined),
    };
    mockChatChannel.mockReturnValue(mockChannel);

    const req = {
      body: { language: "javascript", sessionType: "one-on-one" },
      user: makeUser(),
    };
    const res = makeRes();

    await createSession(req, res);

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ maxParticipants: 1 }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("clamps maxParticipants to 10 when value is NaN for group sessions", async () => {
    const createdSession = makeSession({ language: "javascript", maxParticipants: 10 });
    mockSessionCreate.mockResolvedValue(createdSession);

    const mockCall = { getOrCreate: jest.fn().mockResolvedValue(undefined) };
    mockStreamVideoCall.mockReturnValue(mockCall);

    const mockChannel = { create: jest.fn().mockResolvedValue(undefined) };
    mockChatChannel.mockReturnValue(mockChannel);

    const req = {
      body: {
        language: "javascript",
        sessionType: "group",
        maxParticipants: "not-a-number",
      },
      user: makeUser(),
    };
    const res = makeRes();

    await createSession(req, res);

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ maxParticipants: 10 }),
    );
  });

  it("clamps maxParticipants to 10 when value is below 2 for group sessions", async () => {
    const createdSession = makeSession({ language: "javascript", maxParticipants: 10 });
    mockSessionCreate.mockResolvedValue(createdSession);

    const mockCall = { getOrCreate: jest.fn().mockResolvedValue(undefined) };
    mockStreamVideoCall.mockReturnValue(mockCall);

    const mockChannel = { create: jest.fn().mockResolvedValue(undefined) };
    mockChatChannel.mockReturnValue(mockChannel);

    const req = {
      body: {
        language: "javascript",
        sessionType: "group",
        maxParticipants: 1,
      },
      user: makeUser(),
    };
    const res = makeRes();

    await createSession(req, res);

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ maxParticipants: 10 }),
    );
  });

  it("uses provided maxParticipants within valid range for group", async () => {
    const createdSession = makeSession({ language: "javascript", maxParticipants: 5 });
    mockSessionCreate.mockResolvedValue(createdSession);

    const mockCall = { getOrCreate: jest.fn().mockResolvedValue(undefined) };
    mockStreamVideoCall.mockReturnValue(mockCall);

    const mockChannel = { create: jest.fn().mockResolvedValue(undefined) };
    mockChatChannel.mockReturnValue(mockChannel);

    const req = {
      body: { language: "javascript", sessionType: "group", maxParticipants: 5 },
      user: makeUser(),
    };
    const res = makeRes();

    await createSession(req, res);

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ maxParticipants: 5 }),
    );
  });

  it("returns 404 if courseId references a non-existent course", async () => {
    mockCourseFindById.mockResolvedValue(null);

    const req = {
      body: {
        language: "javascript",
        sessionType: "one-on-one",
        courseId: "bad-course-id",
      },
      user: makeUser({ role: "teacher" }),
    };
    const res = makeRes();

    await createSession(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Course not found" });
  });

  it("returns 403 if non-teacher tries to create a course session", async () => {
    const mockCourse = { teacher: { toString: () => "other-teacher" } };
    mockCourseFindById.mockResolvedValue(mockCourse);

    const req = {
      body: {
        language: "javascript",
        sessionType: "one-on-one",
        courseId: "course-id",
      },
      user: makeUser({ role: "student" }),
    };
    const res = makeRes();

    await createSession(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 500 on unexpected error", async () => {
    mockSessionCreate.mockRejectedValue(new Error("DB error"));

    const req = {
      body: { language: "javascript", sessionType: "one-on-one" },
      user: makeUser(),
    };
    const res = makeRes();

    // Also need to mock stream to not fail before DB
    const mockCall = { getOrCreate: jest.fn().mockResolvedValue(undefined) };
    mockStreamVideoCall.mockReturnValue(mockCall);
    const mockChannel = { create: jest.fn().mockResolvedValue(undefined) };
    mockChatChannel.mockReturnValue(mockChannel);

    await createSession(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── getActiveSessions ──────────────────────────────────────────────────────

describe("getActiveSessions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns active ad_hoc sessions", async () => {
    const sessions = [makeSession()];
    const mockPopulate1 = jest.fn().mockReturnThis();
    const mockPopulate2 = jest.fn().mockReturnThis();
    const mockPopulate3 = jest.fn().mockReturnThis();
    const mockSort = jest.fn().mockReturnThis();
    const mockLimit = jest.fn().mockResolvedValue(sessions);

    mockSessionFind.mockReturnValue({
      populate: mockPopulate1,
    });
    mockPopulate1.mockReturnValue({ populate: mockPopulate2 });
    mockPopulate2.mockReturnValue({ populate: mockPopulate3 });
    mockPopulate3.mockReturnValue({ sort: mockSort });
    mockSort.mockReturnValue({ limit: mockLimit });

    const res = makeRes();
    await getActiveSessions(undefined, res);

    expect(mockSessionFind).toHaveBeenCalledWith({
      status: "active",
      sessionKind: "ad_hoc",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ sessions });
  });

  it("returns 500 on database error", async () => {
    mockSessionFind.mockImplementation(() => {
      throw new Error("DB error");
    });

    const res = makeRes();
    await getActiveSessions(undefined, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── joinSession ────────────────────────────────────────────────────────────

describe("joinSession", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 404 if session not found", async () => {
    mockSessionFindById.mockResolvedValue(null);

    const req = {
      params: { id: "nonexistent" },
      body: { code: "XYZ" },
      user: makeUser(),
    };
    const res = makeRes();

    await joinSession(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Session not found" });
  });

  it("returns 400 if session is not active (completed)", async () => {
    mockSessionFindById.mockResolvedValue(
      makeSession({ status: "completed" }),
    );

    const req = {
      params: { id: "session-456" },
      body: { code: "ABC123" },
      user: makeUser(),
    };
    const res = makeRes();

    await joinSession(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Cannot join a completed session",
    });
  });

  it("returns 400 if access code is incorrect", async () => {
    mockSessionFindById.mockResolvedValue(
      makeSession({ code: "CORRECT", courseId: null }),
    );

    const req = {
      params: { id: "session-456" },
      body: { code: "WRONG" },
      user: makeUser(),
    };
    const res = makeRes();

    await joinSession(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid access code" });
  });

  it("returns 400 if user is the session host", async () => {
    mockSessionFindById.mockResolvedValue(
      makeSession({
        code: "MYCODE",
        host: { toString: () => "user-123" },
        courseId: null,
      }),
    );

    const req = {
      params: { id: "session-456" },
      body: { code: "MYCODE" },
      user: makeUser({ _id: { toString: () => "user-123" } }),
    };
    const res = makeRes();

    await joinSession(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Host cannot join as a participant",
    });
  });

  it("returns 409 when session is at max capacity", async () => {
    const participants = [
      { toString: () => "p1" },
      { toString: () => "p2" },
    ];
    mockSessionFindById.mockResolvedValue(
      makeSession({
        code: "FULL",
        courseId: null,
        participants,
        maxParticipants: 2,
        host: { toString: () => "host-999" },
        hostId: { toString: () => "host-999" },
      }),
    );

    const req = {
      params: { id: "session-456" },
      body: { code: "FULL" },
      user: makeUser({ _id: { toString: () => "new-user" } }),
    };
    const res = makeRes();

    await joinSession(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "Session is full" });
  });

  it("adds participant, saves session and adds stream member when joining successfully", async () => {
    const mockAddMembers = jest.fn().mockResolvedValue(undefined);
    const mockChannelObj = { addMembers: mockAddMembers };
    mockChatChannel.mockReturnValue(mockChannelObj);
    mockSessionSave.mockResolvedValue(undefined);
    mockSaveCourseWithRepair.mockResolvedValue(undefined);

    const session = makeSession({
      code: "JOINME",
      courseId: null,
      participants: [],
      maxParticipants: 5,
      host: { toString: () => "host-999" },
      hostId: { toString: () => "host-999" },
    });
    mockSessionFindById.mockResolvedValue(session);

    const req = {
      params: { id: "session-456" },
      body: { code: "JOINME" },
      user: makeUser({
        _id: { toString: () => "new-participant" },
        clerkId: "clerk-new",
      }),
    };
    const res = makeRes();

    await joinSession(req, res);

    expect(session.participants).toHaveLength(1);
    expect(mockSessionSave).toHaveBeenCalledTimes(1);
    expect(mockAddMembers).toHaveBeenCalledWith(["clerk-new"]);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 200 without re-adding if participant is already in session", async () => {
    const userId = { toString: () => "already-in" };
    const session = makeSession({
      code: "AGAIN",
      courseId: null,
      participants: [userId],
      maxParticipants: 5,
      host: { toString: () => "host-999" },
      hostId: { toString: () => "host-999" },
    });
    mockSessionFindById.mockResolvedValue(session);

    const req = {
      params: { id: "session-456" },
      body: { code: "AGAIN" },
      user: makeUser({ _id: { toString: () => "already-in" } }),
    };
    const res = makeRes();

    await joinSession(req, res);

    expect(mockSessionSave).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 403 when trying to join a course session without enrollment", async () => {
    const session = makeSession({ courseId: "course-id" });
    mockSessionFindById.mockResolvedValue(session);

    const mockCourse = {
      teacher: { _id: { toString: () => "other-teacher" }, toString: () => "other-teacher" },
      enrollments: [],
    };
    const mockPopulateCourse = jest.fn().mockResolvedValue(mockCourse);
    mockCourseFindById.mockReturnValue({ populate: mockPopulateCourse });

    const req = {
      params: { id: "session-456" },
      body: { code: "IRRELEVANT" },
      user: makeUser({ _id: { toString: () => "non-enrolled" } }),
    };
    const res = makeRes();

    await joinSession(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "You are not approved to join this live class",
    });
  });
});

// ─── kickParticipant ────────────────────────────────────────────────────────

describe("kickParticipant", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 404 if session not found", async () => {
    const mockPopulate = jest.fn().mockResolvedValue(null);
    mockSessionFindById.mockReturnValue({ populate: mockPopulate });

    const req = {
      params: { id: "nonexistent" },
      body: { participantId: "p1" },
      user: makeUser(),
    };
    const res = makeRes();

    await kickParticipant(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 403 if caller is not the host", async () => {
    const session = makeSession({
      host: { toString: () => "actual-host" },
      hostId: { toString: () => "actual-host" },
    });
    const mockPopulate = jest.fn().mockResolvedValue(session);
    mockSessionFindById.mockReturnValue({ populate: mockPopulate });

    const req = {
      params: { id: "session-456" },
      body: { participantId: "p1" },
      user: makeUser({ _id: { toString: () => "not-host" } }),
    };
    const res = makeRes();

    await kickParticipant(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Only the host can kick a participant",
    });
  });

  it("returns 404 if participant not in session", async () => {
    const session = makeSession({
      participants: [
        { _id: { toString: () => "someone-else" }, clerkId: "clerk-else" },
      ],
    });
    const mockPopulate = jest.fn().mockResolvedValue(session);
    mockSessionFindById.mockReturnValue({ populate: mockPopulate });

    const req = {
      params: { id: "session-456" },
      body: { participantId: "nonexistent-participant" },
      user: makeUser(),
    };
    const res = makeRes();

    await kickParticipant(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Participant not found in session",
    });
  });

  it("removes participant from session and stream channel", async () => {
    const mockRemoveMembers = jest.fn().mockResolvedValue(undefined);
    mockChatChannel.mockReturnValue({ removeMembers: mockRemoveMembers });
    mockSessionSave.mockResolvedValue(undefined);

    const participantToKick = {
      _id: { toString: () => "target-participant" },
      clerkId: "clerk-target",
    };
    const session = makeSession({
      participants: [participantToKick],
    });
    const mockPopulate = jest.fn().mockResolvedValue(session);
    mockSessionFindById.mockReturnValue({ populate: mockPopulate });

    const req = {
      params: { id: "session-456" },
      body: { participantId: "target-participant" },
      user: makeUser(),
    };
    const res = makeRes();

    await kickParticipant(req, res);

    expect(mockRemoveMembers).toHaveBeenCalledWith(["clerk-target"]);
    expect(session.participants).toHaveLength(0);
    expect(mockSessionSave).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Participant kicked successfully" }),
    );
  });
});

// ─── endSession ─────────────────────────────────────────────────────────────

describe("endSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWhiteboardStateByRoom.clear();
    mockWhiteboardPersistTimersByRoom.clear();
    mockQuizStateByRoom.clear();
  });

  it("returns 404 if session not found", async () => {
    mockSessionFindById.mockResolvedValue(null);

    const req = { params: { id: "nonexistent" }, user: makeUser() };
    const res = makeRes();

    await endSession(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 403 if caller is not the host", async () => {
    mockSessionFindById.mockResolvedValue(
      makeSession({
        host: { toString: () => "actual-host" },
        hostId: { toString: () => "actual-host" },
      }),
    );

    const req = {
      params: { id: "session-456" },
      user: makeUser({ _id: { toString: () => "not-host" } }),
    };
    const res = makeRes();

    await endSession(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Only the host can end the session",
    });
  });

  it("returns 400 if session is already completed", async () => {
    mockSessionFindById.mockResolvedValue(
      makeSession({ status: "completed" }),
    );

    const req = { params: { id: "session-456" }, user: makeUser() };
    const res = makeRes();

    await endSession(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Session is already completed",
    });
  });

  it("ends session, deletes stream call and chat, cleans up in-memory state", async () => {
    const session = makeSession({ status: "active" });
    mockSessionFindById.mockResolvedValue(session);
    mockSessionSave.mockResolvedValue(undefined);
    mockSaveCourseWithRepair.mockResolvedValue(undefined);

    const mockDelete = jest.fn().mockResolvedValue(undefined);
    const mockCallDelete = { delete: mockDelete };
    mockStreamVideoCall.mockReturnValue(mockCallDelete);

    const mockChannelDelete = jest.fn().mockResolvedValue(undefined);
    mockChatChannel.mockReturnValue({ delete: mockChannelDelete });

    // Seed in-memory maps
    mockWhiteboardStateByRoom.set("session-456", { elements: [] });
    mockQuizStateByRoom.set("session-456", { question: "Q?" });

    const req = { params: { id: "session-456" }, user: makeUser() };
    const res = makeRes();

    await endSession(req, res);

    expect(session.status).toBe("completed");
    expect(mockSessionSave).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith({ hard: true });
    expect(mockChannelDelete).toHaveBeenCalledTimes(1);
    expect(mockWhiteboardStateByRoom.has("session-456")).toBe(false);
    expect(mockQuizStateByRoom.has("session-456")).toBe(false);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Session ended successfully" }),
    );
  });

  it("clears whiteboard persist timer on end", async () => {
    const session = makeSession({ status: "active" });
    mockSessionFindById.mockResolvedValue(session);
    mockSessionSave.mockResolvedValue(undefined);
    mockSaveCourseWithRepair.mockResolvedValue(undefined);

    const mockDelete = jest.fn().mockResolvedValue(undefined);
    mockStreamVideoCall.mockReturnValue({ delete: mockDelete });
    mockChatChannel.mockReturnValue({ delete: jest.fn().mockResolvedValue(undefined) });

    const timer = setTimeout(() => {}, 60000);
    mockWhiteboardPersistTimersByRoom.set("session-456", timer);

    const req = { params: { id: "session-456" }, user: makeUser() };
    const res = makeRes();

    await endSession(req, res);

    expect(mockWhiteboardPersistTimersByRoom.has("session-456")).toBe(false);
    clearTimeout(timer); // cleanup if not cleared
  });

  it("clears quiz active timer on end", async () => {
    const session = makeSession({ status: "active" });
    mockSessionFindById.mockResolvedValue(session);
    mockSessionSave.mockResolvedValue(undefined);
    mockSaveCourseWithRepair.mockResolvedValue(undefined);

    mockStreamVideoCall.mockReturnValue({
      delete: jest.fn().mockResolvedValue(undefined),
    });
    mockChatChannel.mockReturnValue({
      delete: jest.fn().mockResolvedValue(undefined),
    });

    const quizTimer = setTimeout(() => {}, 60000);
    mockQuizStateByRoom.set("session-456", { activeTimer: quizTimer });

    const req = { params: { id: "session-456" }, user: makeUser() };
    const res = makeRes();

    await endSession(req, res);

    expect(mockQuizStateByRoom.has("session-456")).toBe(false);
    clearTimeout(quizTimer);
  });
});

// ─── getMyRecentSessions ────────────────────────────────────────────────────

describe("getMyRecentSessions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns recent completed sessions for the user", async () => {
    const sessions = [makeSession({ status: "completed" })];
    const mockSort = jest.fn().mockReturnThis();
    const mockLimit = jest.fn().mockResolvedValue(sessions);

    mockSessionFind.mockReturnValue({
      sort: mockSort,
      limit: mockLimit,
    });
    mockSort.mockReturnValue({ limit: mockLimit });

    const req = { user: makeUser() };
    const res = makeRes();

    await getMyRecentSessions(req, res);

    expect(mockSessionFind).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ sessions });
  });

  it("returns 500 on database error", async () => {
    mockSessionFind.mockImplementation(() => {
      throw new Error("DB failed");
    });

    const req = { user: makeUser() };
    const res = makeRes();

    await getMyRecentSessions(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});