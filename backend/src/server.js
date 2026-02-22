import express from "express";
import path from "path";
import cors from "cors";
import http from "http";
import { randomUUID } from "crypto";
import { Server } from "socket.io";
import { serve } from "inngest/express";
import { clerkMiddleware, verifyToken } from "@clerk/express";

import { ENV } from "./lib/env.js";
import { connectDB } from "./lib/db.js";
import { inngest, functions } from "./lib/inngest.js";

import chatRoutes from "./routes/chatRoutes.js";
import sessionRoutes from "./routes/sessionRoute.js";
import codeExecutionRoutes from "./routes/codeExecutionRoute.js";

import Session from "./models/Session.js";
import User from "./models/User.js";
import { chatClient, streamClient } from "./lib/stream.js";

const app = express();
const httpServer = http.createServer(app);

const __dirname = path.resolve();

// middleware
app.use(express.json());
// credentials:true meaning?? => server allows a browser to include cookies on request
app.use(cors({ origin: ENV.CLIENT_URL, credentials: true }));
app.use(clerkMiddleware()); // this adds auth field to request object: req.auth()

const io = new Server(httpServer, {
  cors: {
    origin: ENV.CLIENT_URL, // Allow requests from your frontend
    methods: ["GET", "POST"],
  },
});

export const whiteboardStateByRoom = new Map();
export const quizStateByRoom = new Map();
export const whiteboardPersistTimersByRoom = new Map();
const WHITEBOARD_MAX_COORDINATE = 4000;
const WHITEBOARD_MAX_ELEMENTS = 2000;
const WHITEBOARD_DB_PERSIST_DEBOUNCE_MS = 1200;
const SOCKET_ACCESS_CACHE_TTL_MS = 5000;
const QUIZ_MAX_QUESTIONS = 200;
const QUIZ_MIN_TIME_SEC = 10;
const QUIZ_MAX_TIME_SEC = 120;
const QUIZ_MAX_TEXT_LENGTH = 500;
const QUIZ_BASE_POINTS = 100;
const QUIZ_SPEED_BONUS_MAX = 100;

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

const isSafePoint = (point) => {
  if (!Array.isArray(point) || point.length < 2) return false;
  const [x, y] = point;
  return (
    isFiniteNumber(x) &&
    isFiniteNumber(y) &&
    Math.abs(x) <= WHITEBOARD_MAX_COORDINATE &&
    Math.abs(y) <= WHITEBOARD_MAX_COORDINATE
  );
};

const sanitizeWhiteboardElement = (element) => {
  if (!element || typeof element !== "object") return null;

  const newElement = { ...element };

  // Sanitize x, y
  newElement.x = isFiniteNumber(element.x) ? element.x : 0;
  newElement.y = isFiniteNumber(element.y) ? element.y : 0;

  // Reject element if its base position is out of bounds
  if (Math.abs(newElement.x) > WHITEBOARD_MAX_COORDINATE || Math.abs(newElement.y) > WHITEBOARD_MAX_COORDINATE) {
    console.warn("Element position out of bounds, rejecting:", element);
    return null;
  }

  // Sanitize points array if present
  if (Array.isArray(element.points)) {
    newElement.points = element.points.filter(isSafePoint);
    if (newElement.points.length === 0 && element.type === "freedraw") {
        console.warn("Freedraw element with no safe points, rejecting:", element);
        return null; // Reject freedraw if it has no valid points
    }
  } else if (element.type === "freedraw") {
       console.warn("Freedraw element without a points array, rejecting:", element);
       return null; // Freedraw must have points
  }


  // Keep freedraw geometry untouched. Excalidraw stores points relative to the
  // element origin, so recomputing bounds here can break strokes.
  if (element.type === "freedraw") {
    if (!newElement.points || newElement.points.length === 0) {
      console.warn("Freedraw element with invalid or empty points array after sanitization, rejecting:", element);
      return null;
    }
    if (!isFiniteNumber(newElement.width)) newElement.width = 0;
    if (!isFiniteNumber(newElement.height)) newElement.height = 0;
  } else {
    // For other elements, ensure width/height are finite and not excessively large
    if (!isFiniteNumber(newElement.width)) newElement.width = 0;
    if (!isFiniteNumber(newElement.height)) newElement.height = 0;

    if (Math.abs(newElement.width) > WHITEBOARD_MAX_COORDINATE || Math.abs(newElement.height) > WHITEBOARD_MAX_COORDINATE) {
      console.warn("Element width/height out of bounds for non-freedraw type, rejecting:", element);
      return null;
    }
  }

  return newElement;
};

const sanitizeWhiteboardElements = (elements) => {
  if (!Array.isArray(elements)) return [];
  return elements
    .slice(0, WHITEBOARD_MAX_ELEMENTS)
    .map(sanitizeWhiteboardElement)
    .filter(Boolean);
};

const getElementVersion = (element) => {
  if (!element || typeof element !== "object") return 0;
  return Number.isFinite(element.version) ? element.version : 0;
};

const getElementUpdated = (element) => {
  if (!element || typeof element !== "object") return 0;
  return Number.isFinite(element.updated) ? element.updated : 0;
};

const isIncomingElementNewer = (incoming, current) => {
  const incomingVersion = getElementVersion(incoming);
  const currentVersion = getElementVersion(current);
  if (incomingVersion !== currentVersion) {
    return incomingVersion > currentVersion;
  }

  const incomingUpdated = getElementUpdated(incoming);
  const currentUpdated = getElementUpdated(current);
  if (incomingUpdated !== currentUpdated) {
    return incomingUpdated > currentUpdated;
  }

  return true;
};

const mergeWhiteboardElementsByVersion = (currentElements, incomingElements) => {
  const current = Array.isArray(currentElements) ? currentElements : [];
  const incoming = Array.isArray(incomingElements) ? incomingElements : [];

  const mergedById = new Map();
  for (const element of current) {
    if (element?.id) mergedById.set(element.id, element);
  }

  for (const incomingElement of incoming) {
    if (!incomingElement?.id) continue;

    const currentElement = mergedById.get(incomingElement.id);
    if (!currentElement || isIncomingElementNewer(incomingElement, currentElement)) {
      mergedById.set(incomingElement.id, incomingElement);
    }
  }

  const output = [];
  const seenIds = new Set();

  for (const element of incoming) {
    if (!element?.id || seenIds.has(element.id)) continue;
    const merged = mergedById.get(element.id);
    if (merged) {
      output.push(merged);
      seenIds.add(element.id);
    }
  }

  for (const element of current) {
    if (!element?.id || seenIds.has(element.id)) continue;
    const merged = mergedById.get(element.id);
    if (merged) {
      output.push(merged);
      seenIds.add(element.id);
    }
  }

  return output.slice(0, WHITEBOARD_MAX_ELEMENTS);
};

const normalizeWhiteboardWriteMode = (mode) => {
  if (mode === "all" || mode === "approved" || mode === "host-only") return mode;
  return "host-only";
};

const normalizeWriterIds = (writerIds = []) =>
  Array.isArray(writerIds)
    ? writerIds
        .map((id) => (id == null ? "" : id.toString()))
        .filter(Boolean)
    : [];

const sceneSignature = (elements = []) =>
  (Array.isArray(elements) ? elements : [])
    .map((el) => `${el.id}:${el.version}:${el.versionNonce}:${el.isDeleted ? 1 : 0}`)
    .join("|");

const buildWhiteboardPermissions = ({ isHost, writeMode, writerIds, socketMongoUserId }) => {
  const normalizedMode = normalizeWhiteboardWriteMode(writeMode);
  const normalizedWriterIds = normalizeWriterIds(writerIds);
  const canWrite =
    isHost ||
    normalizedMode === "all" ||
    (normalizedMode === "approved" && normalizedWriterIds.includes(socketMongoUserId));

  return {
    writeMode: normalizedMode,
    writerIds: normalizedWriterIds,
    canWrite,
  };
};

const clearWhiteboardPersistTimer = (roomId) => {
  const timer = whiteboardPersistTimersByRoom.get(roomId);
  if (timer) {
    clearTimeout(timer);
    whiteboardPersistTimersByRoom.delete(roomId);
  }
};

const persistWhiteboardStateNow = async (roomId) => {
  const state = whiteboardStateByRoom.get(roomId);
  if (!state) return;

  await Session.findByIdAndUpdate(roomId, {
    whiteboardElements: state.elements || [],
    whiteboardAppState: state.appState || {},
    whiteboardIsOpen: Boolean(state.isOpen),
    whiteboardWriteMode: normalizeWhiteboardWriteMode(state.writeMode),
    whiteboardWriters: normalizeWriterIds(state.writerIds),
  });
};

const scheduleWhiteboardPersistence = (roomId, delay = WHITEBOARD_DB_PERSIST_DEBOUNCE_MS) => {
  clearWhiteboardPersistTimer(roomId);
  const timer = setTimeout(async () => {
    try {
      await persistWhiteboardStateNow(roomId);
    } catch (error) {
      console.error("Error persisting whiteboard state:", error.message);
    } finally {
      whiteboardPersistTimersByRoom.delete(roomId);
    }
  }, delay);

  whiteboardPersistTimersByRoom.set(roomId, timer);
};

const sanitizeQuizText = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, QUIZ_MAX_TEXT_LENGTH);
};

const normalizeTimeLimitSec = (value, fallback = 30) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(QUIZ_MAX_TIME_SEC, Math.max(QUIZ_MIN_TIME_SEC, parsed));
};

const normalizeQuizQuestion = (question, defaultTimeLimitSec = 30) => {
  if (!question || typeof question !== "object") {
    return { valid: false, error: "Question must be an object" };
  }

  const prompt = sanitizeQuizText(question.prompt);
  if (!prompt) {
    return { valid: false, error: "Question prompt is required" };
  }

  const options = Array.isArray(question.options)
    ? question.options.map((option) => sanitizeQuizText(option))
    : [];

  if (options.length !== 4 || options.some((option) => !option)) {
    return { valid: false, error: "Question must contain exactly 4 non-empty options" };
  }

  const correctOptionIndex = Number.parseInt(question.correctOptionIndex, 10);
  if (!Number.isFinite(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex > 3) {
    return { valid: false, error: "correctOptionIndex must be between 0 and 3" };
  }

  const normalized = {
    id: sanitizeQuizText(question.id) || randomUUID(),
    type: "single-choice",
    prompt,
    options,
    correctOptionIndex,
    timeLimitSec: normalizeTimeLimitSec(question.timeLimitSec, defaultTimeLimitSec),
    explanation: sanitizeQuizText(question.explanation || ""),
  };

  return { valid: true, question: normalized };
};

const normalizeQuizPayload = (quizPayload) => {
  if (!quizPayload || typeof quizPayload !== "object") {
    return { valid: false, error: "Quiz payload must be an object" };
  }

  const defaultTimeLimitSec = normalizeTimeLimitSec(quizPayload.defaultTimeLimitSec, 30);
  const questions = Array.isArray(quizPayload.questions) ? quizPayload.questions : null;
  if (!questions || questions.length === 0) {
    return { valid: false, error: "questions array is required" };
  }
  if (questions.length > QUIZ_MAX_QUESTIONS) {
    return { valid: false, error: `Maximum ${QUIZ_MAX_QUESTIONS} questions are allowed` };
  }

  const normalizedQuestions = [];
  const usedIds = new Set();
  for (let index = 0; index < questions.length; index += 1) {
    const result = normalizeQuizQuestion(questions[index], defaultTimeLimitSec);
    if (!result.valid) {
      return { valid: false, error: `Question ${index + 1}: ${result.error}` };
    }
    if (usedIds.has(result.question.id)) {
      result.question.id = randomUUID();
    }
    usedIds.add(result.question.id);
    normalizedQuestions.push(result.question);
  }

  return {
    valid: true,
    quizBank: normalizedQuestions,
    quizBankMeta: {
      title: sanitizeQuizText(quizPayload.title || ""),
      version: sanitizeQuizText(quizPayload.version || "1.0") || "1.0",
      defaultTimeLimitSec,
    },
  };
};

const computeSubmissionScore = ({ isCorrect, responseMs, durationMs }) => {
  if (!isCorrect) return 0;
  const safeDuration = Math.max(1, durationMs);
  const remainingMs = Math.max(0, safeDuration - responseMs);
  const speedBonus = Math.floor((remainingMs / safeDuration) * QUIZ_SPEED_BONUS_MAX);
  return QUIZ_BASE_POINTS + speedBonus;
};

const sortLeaderboard = (leaderboard = []) =>
  [...leaderboard].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    if (a.avgCorrectResponseMs !== b.avgCorrectResponseMs) {
      return a.avgCorrectResponseMs - b.avgCorrectResponseMs;
    }
    return (a.lastCorrectAt || 0) - (b.lastCorrectAt || 0);
  });

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: ENV.CLERK_SECRET_KEY,
    });

    if (!payload?.sub) {
      return next(new Error("Invalid token payload"));
    }

    socket.userId = payload.sub;
    socket.clerkId = payload.sub;
    next();
  } catch (error) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id, "Clerk ID:", socket.clerkId);
  socket.data.sessionAccessByRoom = new Map();

  const getAuthorizedSessionForSocket = async (roomId, { useCache = true } = {}) => {
    if (!roomId) return null;

    if (useCache) {
      const cachedAccess = socket.data.sessionAccessByRoom.get(roomId);
      if (cachedAccess && Date.now() - (cachedAccess.validatedAt || 0) < SOCKET_ACCESS_CACHE_TTL_MS) {
        return cachedAccess;
      }
    }

    const session = await Session.findById(roomId).populate("host", "clerkId");
    if (!session) return null;

    const currentUser = await User.findOne({ clerkId: socket.clerkId }).select("_id name profileImage");
    if (!currentUser) return null;

    const mongoUserId = currentUser._id.toString();
    const isHost = session.host?._id?.toString() === mongoUserId;
    const isParticipant = session.participants.some((p) => p.toString() === mongoUserId);

    if (!isHost && !isParticipant) return null;

    const access = {
      session,
      isHost,
      isParticipant,
      currentUser,
      mongoUserId,
      validatedAt: Date.now(),
    };
    socket.data.sessionAccessByRoom.set(roomId, access);
    return access;
  };

  const getSocketRoomAccess = (roomId) => socket.data.sessionAccessByRoom.get(roomId) || null;

  const canCurrentSocketWriteWhiteboard = (roomId) => {
    const access = getSocketRoomAccess(roomId);
    if (!access) return false;
    const roomState = whiteboardStateByRoom.get(roomId);
    const permissions = buildWhiteboardPermissions({
      isHost: access.isHost,
      writeMode: roomState?.writeMode || access.session?.whiteboardWriteMode,
      writerIds: roomState?.writerIds || access.session?.whiteboardWriters,
      socketMongoUserId: access.mongoUserId,
    });
    return permissions.canWrite;
  };

  const serializeActiveRoundForClient = (activeRound, socketUserId) => {
    if (!activeRound) return null;

    const submissions = activeRound.submissions || new Map();
    const mySubmission = socketUserId ? submissions.get(socketUserId) : null;

    return {
      roundId: activeRound.roundId,
      questionId: activeRound.question.id,
      prompt: activeRound.question.prompt,
      options: activeRound.question.options,
      startedAt: activeRound.startedAt,
      endsAt: activeRound.endsAt,
      status: activeRound.status,
      mySubmission: mySubmission
        ? {
            selectedOptionIndex: mySubmission.selectedOptionIndex,
            submittedAt: mySubmission.submittedAt,
            responseMs: mySubmission.responseMs,
          }
        : null,
    };
  };

  const getOrCreateQuizState = async (roomId, session) => {
    let state = quizStateByRoom.get(roomId);
    if (state) return state;

    state = {
      quizBank: Array.isArray(session?.quizBank) ? session.quizBank : [],
      quizBankMeta:
        session?.quizBankMeta && typeof session.quizBankMeta === "object"
          ? session.quizBankMeta
          : { title: "", version: "1.0", defaultTimeLimitSec: 30 },
      leaderboard: Array.isArray(session?.quizLeaderboard) ? sortLeaderboard(session.quizLeaderboard) : [],
      history: Array.isArray(session?.quizHistory) ? session.quizHistory : [],
      activeRound: null,
      activeTimer: null,
    };

    if (session?.activeQuizRound?.status === "live") {
      const question = state.quizBank.find((q) => q.id === session.activeQuizRound.questionId);
      if (question) {
        const now = Date.now();
        const startedAt = Number(session.activeQuizRound.startedAt) || now;
        const endsAt = Number(session.activeQuizRound.endsAt) || now;
        const durationMs = Math.max(1, endsAt - startedAt);
        state.activeRound = {
          roundId: session.activeQuizRound.roundId || randomUUID(),
          question,
          startedAt,
          endsAt,
          durationMs,
          status: now < endsAt ? "live" : "closed",
          submissions: new Map(),
        };
      }
    }

    quizStateByRoom.set(roomId, state);
    return state;
  };

  const persistQuizState = async (roomId, state) => {
    if (!state) return;
    const activeQuizRound = state.activeRound
      ? {
          roundId: state.activeRound.roundId,
          questionId: state.activeRound.question.id,
          startedAt: state.activeRound.startedAt,
          endsAt: state.activeRound.endsAt,
          status: state.activeRound.status,
        }
      : null;

    await Session.findByIdAndUpdate(roomId, {
      quizBank: state.quizBank,
      quizBankMeta: state.quizBankMeta,
      quizLeaderboard: state.leaderboard,
      quizHistory: state.history,
      activeQuizRound,
    });
  };

  const buildTop3 = (leaderboard) => sortLeaderboard(leaderboard).slice(0, 3);

  const closeQuizRound = async (roomId, trigger = "auto") => {
    const state = quizStateByRoom.get(roomId);
    if (!state?.activeRound || state.activeRound.status !== "live") return;

    const round = state.activeRound;
    round.status = "closed";
    if (state.activeTimer) {
      clearTimeout(state.activeTimer);
      state.activeTimer = null;
    }

    const leaderboardByUser = new Map(
      state.leaderboard.map((entry) => [entry.userId, { ...entry }]),
    );

    const roundParticipants = [];
    for (const [userId, submission] of round.submissions.entries()) {
      if (submission.isHost) continue;

      const score = computeSubmissionScore({
        isCorrect: submission.isCorrect,
        responseMs: submission.responseMs,
        durationMs: round.durationMs,
      });

      roundParticipants.push({
        userId,
        name: submission.name,
        profileImage: submission.profileImage || "",
        selectedOptionIndex: submission.selectedOptionIndex,
        isCorrect: submission.isCorrect,
        responseMs: submission.responseMs,
        score,
      });

      const existing = leaderboardByUser.get(userId) || {
        userId,
        name: submission.name,
        profileImage: submission.profileImage || "",
        score: 0,
        correctCount: 0,
        totalCorrectResponseMs: 0,
        avgCorrectResponseMs: Number.POSITIVE_INFINITY,
        lastCorrectAt: 0,
      };

      existing.name = submission.name || existing.name;
      existing.profileImage = submission.profileImage || existing.profileImage;
      existing.score += score;

      if (submission.isCorrect) {
        existing.correctCount += 1;
        existing.totalCorrectResponseMs += submission.responseMs;
        existing.avgCorrectResponseMs = Math.floor(
          existing.totalCorrectResponseMs / Math.max(1, existing.correctCount),
        );
        existing.lastCorrectAt = submission.submittedAt;
      }

      leaderboardByUser.set(userId, existing);
    }

    state.leaderboard = sortLeaderboard(
      Array.from(leaderboardByUser.values()).map((entry) => ({
        ...entry,
        avgCorrectResponseMs:
          Number.isFinite(entry.avgCorrectResponseMs) ? entry.avgCorrectResponseMs : 0,
      })),
    );

    const roundSummary = {
      roundId: round.roundId,
      questionId: round.question.id,
      prompt: round.question.prompt,
      correctOptionIndex: round.question.correctOptionIndex,
      endedAt: Date.now(),
      trigger,
      participants: roundParticipants.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.responseMs - b.responseMs;
      }),
    };

    state.history = [...state.history, roundSummary].slice(-200);

    io.in(roomId).emit("quiz-round-closed", {
      roundId: round.roundId,
      correctOptionIndex: round.question.correctOptionIndex,
      explanation: round.question.explanation || "",
      results: roundSummary.participants,
    });

    io.in(roomId).emit("quiz-leaderboard-updated", {
      leaderboard: state.leaderboard,
      top3: buildTop3(state.leaderboard),
    });

    state.activeRound = null;
    await persistQuizState(roomId, state);
  };

  socket.on("join-session", async (roomId) => {
    try {
      const access = await getAuthorizedSessionForSocket(roomId, { useCache: false });
      if (!access?.session) {
        socket.emit("error", { message: "Not authorized to join this session" });
        return;
      }
      const { session, currentUser, isHost, mongoUserId } = access;

      socket.join(roomId);
      console.log(`User ${socket.id} (${socket.clerkId}) joined room: ${roomId}`);

      // Check in-memory cache first
      let roomWhiteboardState = whiteboardStateByRoom.get(roomId); 

      if (!roomWhiteboardState) {
        // If not in cache, load from DB
        roomWhiteboardState = {
          isOpen: session.whiteboardIsOpen,
          elements: session.whiteboardElements,
          appState: session.whiteboardAppState,
          writeMode: normalizeWhiteboardWriteMode(session.whiteboardWriteMode),
          writerIds: normalizeWriterIds(session.whiteboardWriters),
          signature: sceneSignature(session.whiteboardElements),
        };
        whiteboardStateByRoom.set(roomId, roomWhiteboardState); // Cache it
      }

      const permissions = buildWhiteboardPermissions({
        isHost,
        writeMode: roomWhiteboardState.writeMode,
        writerIds: roomWhiteboardState.writerIds,
        socketMongoUserId: mongoUserId,
      });
      
      socket.emit("whiteboard-sync", {
        isOpen: roomWhiteboardState.isOpen,
        elements: roomWhiteboardState.elements || [],
        appState: roomWhiteboardState.appState || {},
        ...permissions,
      });

      const quizState = await getOrCreateQuizState(roomId, session);
      socket.emit("quiz-round-sync", {
        quizBank: quizState.quizBank,
        quizBankMeta: quizState.quizBankMeta,
        leaderboard: quizState.leaderboard,
        top3: buildTop3(quizState.leaderboard),
        activeRound: serializeActiveRoundForClient(
          quizState.activeRound,
          currentUser?._id?.toString(),
        ),
      });

      io.in(roomId).emit("whiteboard-permissions-updated", {
        writeMode: permissions.writeMode,
        writerIds: permissions.writerIds,
      });
    } catch (error) {
      socket.emit("error", { message: "Failed to join session" });
    }
  });

  socket.on("join-session-guest", () => {
    socket.emit("error", { message: "Guest join is not supported" });
  });

  // 2. Handle Code Changes
  socket.on("code-change", async ({ roomId, code }) => {
    if (!roomId || !socket.rooms.has(roomId) || typeof code !== "string") return;
    const access = await getAuthorizedSessionForSocket(roomId);
    if (!access) return;

    // Broadcast to everyone in the room EXCEPT the sender
    socket.to(roomId).emit("code-update", code);
  });

  // 3. Handle Language Changes (Optional but recommended)
  socket.on("language-change", async ({ roomId, language }) => {
    if (!roomId || !socket.rooms.has(roomId) || typeof language !== "string") return;
    const access = await getAuthorizedSessionForSocket(roomId);
    if (!access) return;

    socket.to(roomId).emit("language-update", language);
  });

  socket.on("quiz-upload", async ({ roomId, quizJson }) => {
    if (!roomId || !socket.rooms.has(roomId)) return;
    const access = await getAuthorizedSessionForSocket(roomId);
    if (!access?.isHost) return;

    const normalizedQuiz = normalizeQuizPayload(quizJson);
    if (!normalizedQuiz.valid) {
      socket.emit("quiz-error", { message: normalizedQuiz.error });
      return;
    }

    const state = await getOrCreateQuizState(roomId, access.session);
    if (state.activeRound?.status === "live") {
      socket.emit("quiz-error", { message: "Cannot replace quiz bank while a round is live" });
      return;
    }

    state.quizBank = normalizedQuiz.quizBank;
    state.quizBankMeta = normalizedQuiz.quizBankMeta;
    await persistQuizState(roomId, state);

    io.in(roomId).emit("quiz-bank-loaded", {
      quizBank: state.quizBank,
      quizBankMeta: state.quizBankMeta,
    });
  });

  socket.on("quiz-add-question", async ({ roomId, question }) => {
    if (!roomId || !socket.rooms.has(roomId)) return;
    const access = await getAuthorizedSessionForSocket(roomId);
    if (!access?.isHost) return;

    const state = await getOrCreateQuizState(roomId, access.session);
    if (state.quizBank.length >= QUIZ_MAX_QUESTIONS) {
      socket.emit("quiz-error", { message: `Maximum ${QUIZ_MAX_QUESTIONS} questions are allowed` });
      return;
    }

    const normalized = normalizeQuizQuestion(
      question,
      state.quizBankMeta?.defaultTimeLimitSec || 30,
    );

    if (!normalized.valid) {
      socket.emit("quiz-error", { message: normalized.error });
      return;
    }

    if (state.quizBank.some((q) => q.id === normalized.question.id)) {
      normalized.question.id = randomUUID();
    }

    state.quizBank = [...state.quizBank, normalized.question];
    await persistQuizState(roomId, state);

    io.in(roomId).emit("quiz-bank-loaded", {
      quizBank: state.quizBank,
      quizBankMeta: state.quizBankMeta,
    });
  });

  socket.on("quiz-start-round", async ({ roomId, questionId }) => {
    if (!roomId || !socket.rooms.has(roomId)) return;
    const access = await getAuthorizedSessionForSocket(roomId);
    if (!access?.isHost) return;

    const state = await getOrCreateQuizState(roomId, access.session);
    if (state.activeRound?.status === "live") {
      socket.emit("quiz-error", { message: "A round is already live" });
      return;
    }

    const question = state.quizBank.find((item) => item.id === questionId);
    if (!question) {
      socket.emit("quiz-error", { message: "Question not found" });
      return;
    }

    const startedAt = Date.now();
    const durationMs = normalizeTimeLimitSec(question.timeLimitSec, 30) * 1000;
    const endsAt = startedAt + durationMs;

    state.activeRound = {
      roundId: randomUUID(),
      question,
      startedAt,
      endsAt,
      durationMs,
      status: "live",
      submissions: new Map(),
    };

    if (state.activeTimer) clearTimeout(state.activeTimer);
    state.activeTimer = setTimeout(() => {
      closeQuizRound(roomId, "timeout").catch((error) => {
        console.error("Error closing quiz round on timeout:", error.message);
      });
    }, durationMs + 50);

    await persistQuizState(roomId, state);

    io.in(roomId).emit("quiz-round-started", {
      roundId: state.activeRound.roundId,
      questionId: question.id,
      prompt: question.prompt,
      options: question.options,
      startedAt,
      endsAt,
    });
  });

  socket.on("quiz-submit-answer", async ({ roomId, roundId, selectedOptionIndex }) => {
    if (!roomId || !socket.rooms.has(roomId)) return;
    const access = await getAuthorizedSessionForSocket(roomId);
    if (!access?.session || access.isHost) return;

    const state = await getOrCreateQuizState(roomId, access.session);
    const round = state.activeRound;
    if (!round || round.status !== "live") return;
    if (round.roundId !== roundId) return;

    const now = Date.now();
    if (now > round.endsAt) return;

    const participantId = access.currentUser?._id?.toString();
    if (!participantId) return;
    if (round.submissions.has(participantId)) return;

    const answerIndex = Number.parseInt(selectedOptionIndex, 10);
    if (!Number.isFinite(answerIndex) || answerIndex < 0 || answerIndex > 3) return;

    const responseMs = Math.max(0, now - round.startedAt);
    round.submissions.set(participantId, {
      selectedOptionIndex: answerIndex,
      submittedAt: now,
      responseMs,
      isCorrect: answerIndex === round.question.correctOptionIndex,
      name: access.currentUser?.name || "Participant",
      profileImage: access.currentUser?.profileImage || "",
      isHost: false,
    });

    socket.emit("quiz-answer-accepted", {
      roundId: round.roundId,
      selectedOptionIndex: answerIndex,
      responseMs,
    });
  });

  socket.on("quiz-end-round", async ({ roomId }) => {
    if (!roomId || !socket.rooms.has(roomId)) return;
    const access = await getAuthorizedSessionForSocket(roomId);
    if (!access?.isHost) return;

    await closeQuizRound(roomId, "manual");
  });

  // 4. Whiteboard Sync (Add this)
  socket.on("whiteboard-change", async ({ roomId, elements, appState }) => { // Made async
    if (!roomId || !socket.rooms.has(roomId)) return;
    if (!Array.isArray(elements)) return;
    const access = await getAuthorizedSessionForSocket(roomId);
    if (!access) return;
    if (!canCurrentSocketWriteWhiteboard(roomId)) {
      socket.emit("whiteboard-write-denied", { message: "You do not have write access to the whiteboard." });
      return;
    }

    const sanitizedElements = sanitizeWhiteboardElements(elements);
    const incomingSignature = sceneSignature(sanitizedElements);

    // Update in-memory cache
    const currentState = whiteboardStateByRoom.get(roomId) || {
      isOpen: false,
      elements: [],
      appState: {},
      writeMode: normalizeWhiteboardWriteMode(access.session?.whiteboardWriteMode),
      writerIds: normalizeWriterIds(access.session?.whiteboardWriters),
      signature: "",
    };

    if (incomingSignature && incomingSignature === currentState.signature) {
      return;
    }

    const currentSanitizedElements = Array.isArray(currentState.elements)
      ? currentState.elements
      : sanitizeWhiteboardElements(currentState.elements);
    const mergedElements = mergeWhiteboardElementsByVersion(currentSanitizedElements, sanitizedElements);
    const mergedSignature = sceneSignature(mergedElements);
    whiteboardStateByRoom.set(roomId, {
      ...currentState,
      elements: mergedElements,
      appState: appState || {}, // Ensure default empty object
      signature: mergedSignature,
    });

    // Persist with debounce to avoid DB write on every draw tick.
    scheduleWhiteboardPersistence(roomId);

    // Broadcast to everyone in the room (including the sender)
    io.in(roomId).emit("whiteboard-update", {
      elements: mergedElements,
      appState: appState || {},
      senderSocketId: socket.id,
    });
  });

  // 5. Toggle Whiteboard Visibility (Add this)
  socket.on("toggle-whiteboard", async ({ roomId, isOpen }) => {
    if (!roomId || !socket.rooms.has(roomId)) return;

    try {
      const access = await getAuthorizedSessionForSocket(roomId);
      if (!access?.isHost) return;

      const currentState = whiteboardStateByRoom.get(roomId) || {
        elements: [],
        appState: {},
        writeMode: normalizeWhiteboardWriteMode(access.session?.whiteboardWriteMode),
        writerIds: normalizeWriterIds(access.session?.whiteboardWriters),
        signature: sceneSignature(access.session?.whiteboardElements || []),
      };
      whiteboardStateByRoom.set(roomId, {
        ...currentState,
        isOpen: Boolean(isOpen),
      });

      scheduleWhiteboardPersistence(roomId, 100);

      io.in(roomId).emit("whiteboard-state", isOpen);
    } catch (error) {
      console.error("Error toggling whiteboard:", error.message);
    }
  });

  socket.on("whiteboard-set-write-mode", async ({ roomId, mode }) => {
    if (!roomId || !socket.rooms.has(roomId)) return;
    const access = await getAuthorizedSessionForSocket(roomId);
    if (!access?.isHost) return;

    const nextMode = normalizeWhiteboardWriteMode(mode);
    const currentState = whiteboardStateByRoom.get(roomId) || {
      isOpen: Boolean(access.session?.whiteboardIsOpen),
      elements: access.session?.whiteboardElements || [],
      appState: access.session?.whiteboardAppState || {},
      signature: sceneSignature(access.session?.whiteboardElements || []),
      writeMode: normalizeWhiteboardWriteMode(access.session?.whiteboardWriteMode),
      writerIds: normalizeWriterIds(access.session?.whiteboardWriters),
    };

    const nextState = {
      ...currentState,
      writeMode: nextMode,
    };
    whiteboardStateByRoom.set(roomId, nextState);

    await Session.findByIdAndUpdate(roomId, {
      whiteboardWriteMode: nextMode,
      whiteboardWriters: normalizeWriterIds(nextState.writerIds),
    });

    io.in(roomId).emit("whiteboard-permissions-updated", {
      writeMode: nextMode,
      writerIds: normalizeWriterIds(nextState.writerIds),
    });
  });

  socket.on("whiteboard-grant-writer", async ({ roomId, userId }) => {
    if (!roomId || !socket.rooms.has(roomId) || !userId) return;
    const access = await getAuthorizedSessionForSocket(roomId);
    if (!access?.isHost) return;

    const nextUserId = userId.toString();
    const participantIds = (access.session?.participants || []).map((participantId) =>
      participantId.toString(),
    );
    if (!participantIds.includes(nextUserId)) return;

    const currentState = whiteboardStateByRoom.get(roomId) || {
      isOpen: Boolean(access.session?.whiteboardIsOpen),
      elements: access.session?.whiteboardElements || [],
      appState: access.session?.whiteboardAppState || {},
      signature: sceneSignature(access.session?.whiteboardElements || []),
      writeMode: normalizeWhiteboardWriteMode(access.session?.whiteboardWriteMode),
      writerIds: normalizeWriterIds(access.session?.whiteboardWriters),
    };

    const nextWriterIds = Array.from(new Set([...normalizeWriterIds(currentState.writerIds), nextUserId]));
    whiteboardStateByRoom.set(roomId, {
      ...currentState,
      writerIds: nextWriterIds,
    });

    await Session.findByIdAndUpdate(roomId, { whiteboardWriters: nextWriterIds });
    io.in(roomId).emit("whiteboard-permissions-updated", {
      writeMode: normalizeWhiteboardWriteMode(currentState.writeMode),
      writerIds: nextWriterIds,
    });
  });

  socket.on("whiteboard-revoke-writer", async ({ roomId, userId }) => {
    if (!roomId || !socket.rooms.has(roomId) || !userId) return;
    const access = await getAuthorizedSessionForSocket(roomId);
    if (!access?.isHost) return;

    const targetUserId = userId.toString();
    const participantIds = (access.session?.participants || []).map((participantId) =>
      participantId.toString(),
    );
    if (!participantIds.includes(targetUserId)) return;

    const currentState = whiteboardStateByRoom.get(roomId) || {
      isOpen: Boolean(access.session?.whiteboardIsOpen),
      elements: access.session?.whiteboardElements || [],
      appState: access.session?.whiteboardAppState || {},
      signature: sceneSignature(access.session?.whiteboardElements || []),
      writeMode: normalizeWhiteboardWriteMode(access.session?.whiteboardWriteMode),
      writerIds: normalizeWriterIds(access.session?.whiteboardWriters),
    };

    const nextWriterIds = normalizeWriterIds(currentState.writerIds).filter((id) => id !== targetUserId);
    whiteboardStateByRoom.set(roomId, {
      ...currentState,
      writerIds: nextWriterIds,
    });

    await Session.findByIdAndUpdate(roomId, { whiteboardWriters: nextWriterIds });
    io.in(roomId).emit("whiteboard-permissions-updated", {
      writeMode: normalizeWhiteboardWriteMode(currentState.writeMode),
      writerIds: nextWriterIds,
    });
  });
  socket.on("disconnecting", async () => {
    const rooms = [...socket.rooms];

    for (const roomId of rooms) {
      if (roomId === socket.id) continue; //
      socket.data.sessionAccessByRoom.delete(roomId);

      const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;

      // ADJUSTMENT: Only auto-end if the room is becoming completely empty (0 users left)
      // This prevents a group session from ending just because one participant leaves.
      if (roomSize <= 1) { 
        console.log(`Room ${roomId} is empty. Auto-ending session...`); //
        clearWhiteboardPersistTimer(roomId);
        await persistWhiteboardStateNow(roomId).catch((error) => {
          console.error("Error flushing whiteboard state on room close:", error.message);
        });
        whiteboardStateByRoom.delete(roomId);
        const quizState = quizStateByRoom.get(roomId);
        if (quizState?.activeTimer) clearTimeout(quizState.activeTimer);
        quizStateByRoom.delete(roomId);
        try {
          const session = await Session.findById(roomId);
          
          if (session && session.status === "active") {
            session.status = "completed"; //
            await session.save(); //

            if (session.callId) {
              const call = streamClient.video.call("default", session.callId); //
              await call.delete({ hard: true }).catch((err) => 
                console.log("Stream call cleanup error:", err.message)
              ); //

              const channel = chatClient.channel("messaging", session.callId); //
              await channel.delete().catch((err) => 
                console.log("Stream chat cleanup error:", err.message)
              ); //
            }
          }
        } catch (error) {
          console.error("Error auto-ending session:", error.message); //
        }
      }
    }
  });

  socket.on("toggle-code-space", async ({ roomId, isOpen }) => {
    try {
      if (!roomId || !socket.rooms.has(roomId)) return;
      const access = await getAuthorizedSessionForSocket(roomId);
      if (!access?.isHost) return;

      // 1. Update the "Source of Truth"
      await Session.findByIdAndUpdate(roomId, { isCodeOpen: Boolean(isOpen) });

      // 2. Broadcast the new state to EVERYONE in the room (Host + Participant)
      // We use io.in() instead of socket.to() so the sender (Host) also receives the confirmation event 
      // if you want a single source of truth, or just update local state optimistically.
      // Here we broadcast to everyone so all clients stay in sync.
      io.in(roomId).emit("code-space-state", Boolean(isOpen));
      
      console.log(`Room ${roomId} code space toggled to: ${isOpen}`);
    } catch (error) {
      console.error("Error toggling code space:", error);
    }
  });

  socket.on("toggle-anti-cheat", async ({ roomId, isEnabled }) => {
    try {
      if (!roomId || !socket.rooms.has(roomId)) return;
      const access = await getAuthorizedSessionForSocket(roomId);
      if (!access?.isHost) return;

      await Session.findByIdAndUpdate(roomId, { isAntiCheatEnabled: Boolean(isEnabled) });
      io.in(roomId).emit("anti-cheat-update", Boolean(isEnabled));
    } catch (error) {
      console.error("Error toggling anti-cheat:", error);
    }
  });

  // 5. Handle Cheat Detection
  socket.on("cheat-detected", async ({ roomId, userId, reason }) => {
    if (!roomId || !socket.rooms.has(roomId)) return;
    const access = await getAuthorizedSessionForSocket(roomId);
    if (!access) return;

    // Notify the host (or everyone, and let frontend filter)
    // We send to the room so the host receives it
    socket.to(roomId).emit("cheat-alert", { userId, reason });
  });
  
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/chat", chatRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/code", codeExecutionRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ msg: "api is up and running" });
});

// make our app ready for deployment
if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

const startServer = async () => {
  try {
    await connectDB();
    httpServer.listen(ENV.PORT, () => console.log("Server is running on port:", ENV.PORT));
  } catch (error) {
    console.error("💥 Error starting the server", error);
  }
};

startServer();
