import mongoose from "mongoose";

const studentSnapshotFileSchema = new mongoose.Schema(
  {
    path: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
    language: {
      type: String,
      default: "plaintext",
    },
  },
  { _id: false },
);

const studentSnapshotSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
      index: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    generation: {
      type: Number,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: ["sync-all", "fresh-set", "manual", "detach"],
      default: "manual",
    },
    activeFilePath: {
      type: String,
      default: "",
    },
    files: {
      type: [studentSnapshotFileSchema],
      default: [],
    },
    intent: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

const StudentSnapshot = mongoose.model("StudentSnapshot", studentSnapshotSchema);

export default StudentSnapshot;
