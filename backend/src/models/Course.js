import mongoose from "mongoose";

const generateInviteCode = () =>
  Math.random().toString(36).slice(2, 10).toUpperCase();

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: true },
);

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["joined", "completed"],
      default: "joined",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
      default: null,
    },
    durationMinutes: {
      type: Number,
      default: 0,
    },
  },
  { _id: true },
);

const classSessionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    scheduledStart: {
      type: Date,
      required: true,
    },
    scheduledEnd: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "live", "completed", "cancelled"],
      default: "scheduled",
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      default: null,
    },
    usePersistentRoom: {
      type: Boolean,
      default: false,
    },
    sessionType: {
      type: String,
      enum: ["interactive", "livestream"],
      default: "interactive",
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    attendance: {
      type: [attendanceSchema],
      default: [],
    },
  },
  { _id: true },
);

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: "",
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["submitted", "reviewed"],
      default: "submitted",
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: 1200,
      default: "",
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: true },
);

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    submissions: {
      type: [assignmentSubmissionSchema],
      default: [],
    },
  },
  { _id: true },
);

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 24,
      unique: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    language: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced", "All Levels"],
      default: "All Levels",
    },
    shortDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 220,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    persistentRoomEnabled: {
      type: Boolean,
      default: true,
    },
    persistentSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      default: null,
    },
    enrollmentMode: {
      type: String,
      enum: ["open", "approval", "invite"],
      default: "open",
    },
    inviteCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 16,
      default: generateInviteCode,
    },
    enrollments: {
      type: [enrollmentSchema],
      default: [],
    },
    classSessions: {
      type: [classSessionSchema],
      default: [],
    },
    assignments: {
      type: [assignmentSchema],
      default: [],
    },
  },
  { timestamps: true },
);

courseSchema.index(
  {
    title: "text",
    code: "text",
    shortDescription: "text",
    description: "text",
    category: "text",
    language: "text",
    tags: "text",
  },
  { language_override: "searchLanguage" },
);

const Course = mongoose.model("Course", courseSchema);

export default Course;
