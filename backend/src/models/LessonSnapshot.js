import mongoose from "mongoose";

const lessonSnapshotFileSchema = new mongoose.Schema(
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

const lessonSnapshotSchema = new mongoose.Schema(
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
      default: null,
      index: true,
    },
    teacherWorkspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    generation: {
      type: Number,
      default: 1,
      index: true,
    },
    lessonVersion: {
      type: Number,
      required: true,
      index: true,
    },
    templateId: {
      type: String,
      default: "",
    },
    activeFilePath: {
      type: String,
      default: "",
    },
    files: {
      type: [lessonSnapshotFileSchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

lessonSnapshotSchema.index(
  { sessionId: 1, generation: 1, lessonVersion: 1 },
  { unique: true },
);

const LessonSnapshot = mongoose.model("LessonSnapshot", lessonSnapshotSchema);

export default LessonSnapshot;
