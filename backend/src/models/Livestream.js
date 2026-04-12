import mongoose from "mongoose";

const livestreamViewerAttendanceSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    classSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    viewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    firstJoinedAt: {
      type: Date,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

livestreamViewerAttendanceSchema.index(
  { sessionId: 1, viewerId: 1 },
  { unique: true },
);

const livestreamChatMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "Participant",
    },
    userImage: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      trim: true,
      maxlength: 1000,
      required: true,
    },
  },
  { timestamps: true },
);

livestreamChatMessageSchema.index({ sessionId: 1, createdAt: -1 });

const livestreamQuizSubmissionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },
    roundId: {
      type: String,
      required: true,
      index: true,
    },
    questionId: {
      type: String,
      required: true,
    },
    viewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    selectedOptionIndex: {
      type: Number,
      required: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    responseMs: {
      type: Number,
      default: 0,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

livestreamQuizSubmissionSchema.index(
  { sessionId: 1, roundId: 1, viewerId: 1 },
  { unique: true },
);

export const LivestreamViewerAttendance = mongoose.model(
  "LivestreamViewerAttendance",
  livestreamViewerAttendanceSchema,
);

export const LivestreamChatMessage = mongoose.model(
  "LivestreamChatMessage",
  livestreamChatMessageSchema,
);

export const LivestreamQuizSubmission = mongoose.model(
  "LivestreamQuizSubmission",
  livestreamQuizSubmissionSchema,
);
