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
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
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
    whiteboardData: {
      type: Array, // Stores the Excalidraw elements
      default: [],
    },
    isWhiteboardOpen: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const Session = mongoose.model("Session", sessionSchema);

export default Session;
