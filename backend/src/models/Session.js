import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    language: {
      type: String,
      required: true,
      default: "javascript"
    },
    code: {
      type: String,
      required: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      }
    ],
    sessionType: {
      type: String,
      enum: ["one-on-one", "group"],
      default: "one-on-one",
    },
    maxParticipants: {
      type: Number,
      default: 1, // Default for one-on-one (host + 1 participant)
    },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
    callId: {
      type: String,
      default: "",
    },
    isCodeOpen: {
      type: Boolean,
      default: false, // Starts hidden by default (Interviewer focuses on intro first)
    },
    isAntiCheatEnabled: {
      type: Boolean,
      default: false,
    },
    whiteboardElements: { // Array to store Excalidraw elements
      type: Array,
      default: [],
    },
    whiteboardAppState: { // Object to store Excalidraw appState
      type: Object,
      default: {},
    },
    whiteboardIsOpen: { // State for whiteboard visibility
      type: Boolean,
      default: false,
    },
    whiteboardWriteMode: {
      type: String,
      enum: ["host-only", "approved", "all"],
      default: "host-only",
    },
    whiteboardWriters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    quizBank: {
      type: Array,
      default: [],
    },
    quizBankMeta: {
      type: Object,
      default: {
        title: "",
        version: "1.0",
      },
    },
    quizLeaderboard: {
      type: Array,
      default: [],
    },
    quizHistory: {
      type: Array,
      default: [],
    },
    activeQuizRound: {
      type: Object,
      default: null,
    },
  },
  { timestamps: true }
);

const Session = mongoose.model("Session", sessionSchema);

export default Session;
