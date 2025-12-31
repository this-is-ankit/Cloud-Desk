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
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
  },
  { timestamps: true }
);

const Session = mongoose.model("Session", sessionSchema);

export default Session;