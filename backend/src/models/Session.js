import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    language: {
      type: String,
      required: true,
      default: "javascript",
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
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    sessionType: {
      type: String,
      enum: ["interactive", "livestream"],
      default: "interactive",
    },
    maxParticipants: {
      type: Number,
      default: 1, // Default for one-on-one (host + 1 participant)
    },
    status: {
      type: String,
      enum: ["scheduled", "active", "completed", "cancelled"],
      default: "active",
    },
    callId: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
    classSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    sessionKind: {
      type: String,
      enum: ["ad_hoc", "course_room", "class", "office_hours"],
      default: "ad_hoc",
    },
    isCodeOpen: {
      type: Boolean,
      default: false, // Starts hidden by default (Interviewer focuses on intro first)
    },
    isAntiCheatEnabled: {
      type: Boolean,
      default: false,
    },
    whiteboardElements: {
      // Array to store Excalidraw elements
      type: Array,
      default: [],
    },
    whiteboardAppState: {
      // Object to store Excalidraw appState
      type: Object,
      default: {},
    },
    whiteboardIsOpen: {
      // State for whiteboard visibility
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
    livestream: {
      isLive: {
        type: Boolean,
        default: false,
      },
      startedAt: {
        type: Date,
        default: null,
      },
      endedAt: {
        type: Date,
        default: null,
      },
      hostDisconnectedAt: {
        type: Date,
        default: null,
      },
      hostDisconnectDeadline: {
        type: Date,
        default: null,
      },
      peakViewerCount: {
        type: Number,
        default: 0,
      },
    },
    livestreamCodeSnapshot: {
      language: {
        type: String,
        default: "javascript",
      },
      code: {
        type: String,
        default: "",
      },
      version: {
        type: Number,
        default: 0,
      },
      updatedAt: {
        type: Date,
        default: null,
      },
    },
    livestreamWhiteboardSnapshot: {
      elements: {
        type: Array,
        default: [],
      },
      appState: {
        type: Object,
        default: {},
      },
      version: {
        type: Number,
        default: 0,
      },
      updatedAt: {
        type: Date,
        default: null,
      },
    },
    isCircuitOpen: {
      type: Boolean,
      default: false,
    },
    circuitState: {
      type: Object,
      default: {
        components: [],
        wires: [],
      },
    },
  },
  { timestamps: true },
);

sessionSchema.pre("validate", function normalizeLegacySessionFields(next) {
  if (this.sessionType === "one-on-one" || this.sessionType === "group") {
    this.sessionType = "interactive";
  }

  if (!this.hostId && this.host) {
    this.hostId = this.host;
  }

  if (this.status === "live") {
    this.status = "active";
  }

  next();
});

const Session = mongoose.model("Session", sessionSchema);

export default Session;
