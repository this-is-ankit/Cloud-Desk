import mongoose from "mongoose";

const workspaceFileSchema = new mongoose.Schema(
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
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const workspaceSchema = new mongoose.Schema(
  {
    ownerUserId: {
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
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
      index: true,
    },
    role: {
      type: String,
      enum: ["teacher", "student"],
      required: true,
    },
    workspaceKind: {
      type: String,
      enum: ["persistent", "fresh"],
      default: "persistent",
    },
    generation: {
      type: Number,
      default: 1,
      index: true,
    },
    templateId: {
      type: String,
      default: "",
    },
    providerType: {
      type: String,
      default: "mock",
    },
    providerWorkspaceId: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["provisioning", "ready", "stopped", "error"],
      default: "ready",
    },
    followMode: {
      type: Boolean,
      default: false,
    },
    baseSnapshotVersion: {
      type: Number,
      default: 0,
    },
    lastAppliedLessonVersion: {
      type: Number,
      default: 0,
    },
    activeFilePath: {
      type: String,
      default: "",
    },
    rootPath: {
      type: String,
      default: "/workspace",
    },
    files: {
      type: [workspaceFileSchema],
      default: [],
    },
    embedUrl: {
      type: String,
      default: "",
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

workspaceSchema.index(
  { ownerUserId: 1, sessionId: 1, generation: 1 },
  { unique: true },
);

const Workspace = mongoose.model("Workspace", workspaceSchema);

export default Workspace;
