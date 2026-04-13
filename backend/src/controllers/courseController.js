import mongoose from "mongoose";
import Course from "../models/Course.js";
import Session from "../models/Session.js";
import { chatClient, streamClient } from "../lib/stream.js";
import {
  createCourseWithRepair,
  saveCourseWithRepair,
} from "../lib/coursePersistence.js";
import {
  getNormalizedSessionLanguage,
  getSessionLanguageLabel,
  normalizeSessionLanguage,
} from "../lib/sessionLanguage.js";

const COURSE_LEVELS = new Set([
  "Beginner",
  "Intermediate",
  "Advanced",
  "All Levels",
]);
const COURSE_SORTS = new Set([
  "relevance",
  "newest",
  "oldest",
  "popular",
  "title",
  "upcoming",
]);
const COURSE_ENROLLMENT_MODES = new Set(["open", "approval", "invite"]);
const MAX_COURSE_LIMIT = 100;
const COURSE_FIELD_LIMITS = {
  title: 120,
  code: 24,
  category: 80,
  language: 50,
  shortDescription: 220,
  description: 4000,
};

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeTags = (value) => {
  const tags = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  return [
    ...new Set(
      tags.map((tag) => normalizeText(tag).toLowerCase()).filter(Boolean),
    ),
  ].slice(0, 12);
};

const normalizeRole = (value) => (value === "teacher" ? "teacher" : "student");
const normalizeEnrollmentMode = (value) =>
  COURSE_ENROLLMENT_MODES.has(value) ? value : "open";
const normalizeClassSessionType = (value) =>
  value === "livestream" ? "livestream" : "interactive";

const assertTeacher = (user) => normalizeRole(user?.role) === "teacher";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findEnrollment = (course, userId) =>
  (course.enrollments || []).find(
    (entry) =>
      entry.student?._id?.toString?.() === userId ||
      entry.student?.toString?.() === userId,
  );

const isTeacherOwner = (course, userId) =>
  course.teacher?._id?.toString?.() === userId ||
  course.teacher?.toString?.() === userId;
const generateInviteCode = () =>
  Math.random().toString(36).slice(2, 10).toUpperCase();

const ensureEnrolledStudent = (course, userId, statuses = ["approved"]) =>
  (course.enrollments || []).find(
    (entry) =>
      statuses.includes(entry.status) &&
      (entry.student?._id?.toString?.() === userId ||
        entry.student?.toString?.() === userId),
  );

const getCourseFieldLengthError = (fields) => {
  for (const [field, limit] of Object.entries(COURSE_FIELD_LIMITS)) {
    const value = fields[field];
    if (typeof value === "string" && value.length > limit) {
      return `${field} must be ${limit} characters or fewer`;
    }
  }

  return null;
};

const getNextUpcomingClass = (classSessions = []) => {
  const now = Date.now();
  return (
    classSessions
      .filter(
        (classSession) =>
          classSession.status === "scheduled" || classSession.status === "live",
      )
      .sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart))
      .find(
        (classSession) => new Date(classSession.scheduledEnd).getTime() >= now,
      ) || null
  );
};

const getNextAssignment = (assignments = []) => {
  const now = Date.now();
  return (
    assignments
      .filter((assignment) => assignment.status === "open")
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .find((assignment) => new Date(assignment.dueDate).getTime() >= now) ||
    null
  );
};

const buildSearchScore = (course, query) => {
  if (!query) return 0;

  const normalizedQuery = query.toLowerCase();
  const title = course.title.toLowerCase();
  const code = course.code.toLowerCase();
  const shortDescription = course.shortDescription.toLowerCase();
  const description = (course.description || "").toLowerCase();
  const category = course.category.toLowerCase();
  const language = course.language.toLowerCase();
  const tags = (course.tags || []).map((tag) => tag.toLowerCase());
  const teacherName = course.teacher?.name?.toLowerCase?.() || "";

  let score = 0;
  if (title === normalizedQuery) score += 120;
  if (title.includes(normalizedQuery)) score += 80;
  if (code === normalizedQuery) score += 100;
  if (code.includes(normalizedQuery)) score += 70;
  if (teacherName.includes(normalizedQuery)) score += 45;
  if (tags.some((tag) => tag === normalizedQuery)) score += 55;
  if (tags.some((tag) => tag.includes(normalizedQuery))) score += 35;
  if (category.includes(normalizedQuery)) score += 30;
  if (language.includes(normalizedQuery)) score += 20;
  if (shortDescription.includes(normalizedQuery)) score += 16;
  if (description.includes(normalizedQuery)) score += 10;
  return score;
};

const serializeEnrollment = (entry) => ({
  _id: entry._id,
  status: entry.status,
  requestedAt: entry.requestedAt,
  decidedAt: entry.decidedAt,
  student: entry.student
    ? {
        _id: entry.student._id,
        name: entry.student.name,
        email: entry.student.email,
        profileImage: entry.student.profileImage,
      }
    : null,
});

const serializeAssignment = (assignment, currentUserId, canManage) => {
  const mySubmission =
    (assignment.submissions || []).find(
      (submission) =>
        submission.student?._id?.toString?.() === currentUserId ||
        submission.student?.toString?.() === currentUserId,
    ) || null;

  return {
    _id: assignment._id,
    title: assignment.title,
    description: assignment.description,
    dueDate: assignment.dueDate,
    status: assignment.status,
    submissionCount: (assignment.submissions || []).length,
    mySubmission: mySubmission
      ? {
          _id: mySubmission._id,
          content: mySubmission.content,
          status: mySubmission.status,
          submittedAt: mySubmission.submittedAt,
          feedback: mySubmission.feedback,
          reviewedAt: mySubmission.reviewedAt,
        }
      : null,
    submissions: canManage
      ? (assignment.submissions || []).map((submission) => ({
          _id: submission._id,
          content: submission.content,
          status: submission.status,
          submittedAt: submission.submittedAt,
          feedback: submission.feedback,
          reviewedAt: submission.reviewedAt,
          student: submission.student
            ? {
                _id: submission.student._id,
                name: submission.student.name,
                email: submission.student.email,
                profileImage: submission.student.profileImage,
              }
            : null,
        }))
      : undefined,
  };
};

const serializeClassSession = (classSession, canManage) => ({
  _id: classSession._id,
  title: classSession.title,
  description: classSession.description,
  scheduledStart: classSession.scheduledStart,
  scheduledEnd: classSession.scheduledEnd,
  status: classSession.status,
  sessionType: normalizeClassSessionType(classSession.sessionType),
  sessionId: classSession.sessionId?._id || classSession.sessionId || null,
  usePersistentRoom: Boolean(classSession.usePersistentRoom),
  startedAt: classSession.startedAt,
  endedAt: classSession.endedAt,
  attendanceCount: (classSession.attendance || []).length,
  attendance: canManage
    ? (classSession.attendance || []).map((entry) => ({
        _id: entry._id,
        status: entry.status,
        joinedAt: entry.joinedAt,
        leftAt: entry.leftAt,
        durationMinutes: entry.durationMinutes,
        student: entry.student
          ? {
              _id: entry.student._id,
              name: entry.student.name,
              email: entry.student.email,
              profileImage: entry.student.profileImage,
            }
          : null,
      }))
    : undefined,
});

const serializeCourseSummary = (course, currentUser) => {
  const currentUserId = currentUser._id.toString();
  const enrollment = findEnrollment(course, currentUserId);
  const nextClass = getNextUpcomingClass(course.classSessions || []);
  const nextAssignment = getNextAssignment(course.assignments || []);
  const pendingEnrollmentCount = (course.enrollments || []).filter(
    (entry) => entry.status === "pending",
  ).length;
  const approvedStudentCount = (course.enrollments || []).filter(
    (entry) => entry.status === "approved",
  ).length;

  return {
    _id: course._id,
    title: course.title,
    code: course.code,
    category: course.category,
    language: course.language,
    level: course.level,
    shortDescription: course.shortDescription,
    description: course.description,
    tags: course.tags || [],
    status: course.status,
    enrollmentMode: course.enrollmentMode,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    teacher: course.teacher
      ? {
          _id: course.teacher._id,
          name: course.teacher.name,
          email: course.teacher.email,
          profileImage: course.teacher.profileImage,
          headline: course.teacher.headline || "",
          subjects: course.teacher.subjects || [],
          languagesSpoken: course.teacher.languagesSpoken || [],
        }
      : null,
    isTeacherOwner: isTeacherOwner(course, currentUserId),
    viewerRole: normalizeRole(currentUser.role),
    viewerEnrollmentStatus: enrollment?.status || null,
    approvedStudentCount,
    pendingEnrollmentCount,
    nextClass: nextClass
      ? {
          _id: nextClass._id,
          title: nextClass.title,
          scheduledStart: nextClass.scheduledStart,
          scheduledEnd: nextClass.scheduledEnd,
          status: nextClass.status,
          sessionType: normalizeClassSessionType(nextClass.sessionType),
          sessionId: nextClass.sessionId?._id || nextClass.sessionId || null,
        }
      : null,
    nextAssignment: nextAssignment
      ? {
          _id: nextAssignment._id,
          title: nextAssignment.title,
          dueDate: nextAssignment.dueDate,
          status: nextAssignment.status,
        }
      : null,
    persistentRoomEnabled: Boolean(course.persistentRoomEnabled),
    persistentSessionId:
      course.persistentSessionId?._id || course.persistentSessionId || null,
    inviteCode: isTeacherOwner(course, currentUserId)
      ? course.inviteCode
      : undefined,
  };
};

const serializeCourseDetail = (course, currentUser) => {
  const currentUserId = currentUser._id.toString();
  const canManage =
    isTeacherOwner(course, currentUserId) &&
    normalizeRole(currentUser.role) === "teacher";
  const enrollment = findEnrollment(course, currentUserId);

  return {
    ...serializeCourseSummary(course, currentUser),
    canManage,
    classSessions: (course.classSessions || []).map((entry) =>
      serializeClassSession(entry, canManage),
    ),
    assignments: (course.assignments || []).map((entry) =>
      serializeAssignment(entry, currentUserId, canManage),
    ),
    enrollments: canManage
      ? (course.enrollments || []).map(serializeEnrollment)
      : undefined,
    approvedStudents: canManage
      ? (course.enrollments || [])
          .filter((entry) => entry.status === "approved")
          .map(serializeEnrollment)
      : undefined,
    myEnrollment:
      enrollment && !canManage
        ? {
            _id: enrollment._id,
            status: enrollment.status,
            requestedAt: enrollment.requestedAt,
            decidedAt: enrollment.decidedAt,
          }
        : null,
  };
};

const coursePopulate = (query) =>
  query
    .populate(
      "teacher",
      "name email profileImage role clerkId headline subjects languagesSpoken availabilityNote",
    )
    .populate("persistentSessionId", "_id status code")
    .populate("enrollments.student", "name email profileImage role clerkId")
    .populate("classSessions.sessionId", "_id status code")
    .populate(
      "classSessions.attendance.student",
      "name email profileImage role clerkId",
    )
    .populate(
      "assignments.submissions.student",
      "name email profileImage role clerkId",
    );

const createRealtimeSession = async ({
  hostUser,
  language,
  title,
  sessionType = "group",
  maxParticipants = 100,
  courseId = null,
  classSessionId = null,
  sessionKind = "ad_hoc",
}) => {
  const sessionLanguage = normalizeSessionLanguage(language);
  const normalizedSessionType = normalizeClassSessionType(sessionType);
  const streamCallType =
    normalizedSessionType === "livestream" ? "livestream" : "default";
  const callId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  const session = await Session.create({
    language: sessionLanguage,
    host: hostUser._id,
    hostId: hostUser._id,
    callId,
    code,
    ideMode: "workspace",
    sessionType: normalizedSessionType,
    maxParticipants,
    participants: [],
    title,
    courseId,
    classSessionId,
    sessionKind,
    isWorkspaceOpen: true,
    workspaceTemplateId: sessionLanguage,
    workspaceStrategy: courseId ? "persistent" : "fresh-per-class",
    workspaceGeneration: 1,
    currentLessonVersion: 0,
    livestream:
      normalizedSessionType === "livestream"
        ? {
            isLive: false,
            startedAt: null,
            endedAt: null,
            hostDisconnectedAt: null,
            hostDisconnectDeadline: null,
            peakViewerCount: 0,
          }
        : undefined,
  });

  await streamClient.video.call(streamCallType, callId).getOrCreate({
    data: {
      created_by_id: hostUser.clerkId,
      members:
        normalizedSessionType === "livestream"
          ? [{ user_id: hostUser.clerkId, role: "host" }]
          : undefined,
      custom: {
        language: sessionLanguage,
        sessionId: session._id.toString(),
        sessionType: normalizedSessionType,
        courseId: courseId ? courseId.toString() : null,
        classSessionId: classSessionId ? classSessionId.toString() : null,
        sessionKind,
      },
    },
  });

  if (normalizedSessionType !== "livestream") {
    const channel = chatClient.channel("messaging", callId, {
      name: title || `${getSessionLanguageLabel(sessionLanguage)} Session`,
      created_by_id: hostUser.clerkId,
      members: [hostUser.clerkId],
    });

    await channel.create();
  }
  return session;
};

const ensureCourseTeacher = (course, user) => {
  if (!assertTeacher(user) || !isTeacherOwner(course, user._id.toString())) {
    return false;
  }
  return true;
};

export async function createCourse(req, res) {
  try {
    if (!assertTeacher(req.user)) {
      return res
        .status(403)
        .json({ message: "Only teachers can create courses" });
    }

    const title = normalizeText(req.body.title);
    const code = normalizeText(req.body.code).toUpperCase();
    const category = normalizeText(req.body.category);
    const rawLanguage = normalizeText(req.body.language);
    const language = getNormalizedSessionLanguage(rawLanguage);
    const level = COURSE_LEVELS.has(req.body.level)
      ? req.body.level
      : "All Levels";
    const shortDescription = normalizeText(req.body.shortDescription);
    const description = normalizeText(req.body.description);
    const tags = normalizeTags(req.body.tags);
    const persistentRoomEnabled = req.body.persistentRoomEnabled !== false;
    const enrollmentMode = normalizeEnrollmentMode(req.body.enrollmentMode);
    const inviteCode =
      normalizeText(req.body.inviteCode).toUpperCase() || generateInviteCode();

    if (!title || !code || !category || !rawLanguage || !shortDescription) {
      return res.status(400).json({
        message:
          "Title, code, category, language, and short description are required",
      });
    }
    if (!language) {
      return res
        .status(400)
        .json({ message: "Choose a supported classroom language" });
    }

    const fieldLengthError = getCourseFieldLengthError({
      title,
      code,
      category,
      language,
      shortDescription,
      description,
    });
    if (fieldLengthError) {
      return res.status(400).json({ message: fieldLengthError });
    }

    const existingCourse = await Course.findOne({ code });
    if (existingCourse) {
      return res.status(409).json({ message: "Course code already exists" });
    }

    const course = await createCourseWithRepair({
      title,
      code,
      category,
      language,
      level,
      shortDescription,
      description,
      tags,
      teacher: req.user._id,
      persistentRoomEnabled,
      enrollmentMode,
      inviteCode,
      status: "draft",
    });

    const populatedCourse = await coursePopulate(Course.findById(course._id));
    res
      .status(201)
      .json({ course: serializeCourseDetail(populatedCourse, req.user) });
  } catch (error) {
    console.error("Error in createCourse controller:", error.message);
    res.status(500).json({
      message:
        error?.name === "ValidationError"
          ? "Invalid course data"
          : "Internal Server Error",
    });
  }
}

export async function getCourses(req, res) {
  try {
    const user = req.user;
    const query = normalizeText(req.query.q);
    const category = normalizeText(req.query.category);
    const level = normalizeText(req.query.level);
    const language = normalizeText(req.query.language);
    const teacher = normalizeText(req.query.teacher);
    const enrollmentMode = normalizeText(req.query.enrollmentMode);
    const scope = normalizeText(req.query.scope);
    const sort = COURSE_SORTS.has(req.query.sort)
      ? req.query.sort
      : query
        ? "relevance"
        : "popular";
    const limit = Math.min(
      MAX_COURSE_LIMIT,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 24),
    );

    const baseQuery = {};
    if (assertTeacher(user)) {
      if (!scope || scope === "mine") {
        baseQuery.teacher = user._id;
      } else if (scope === "discover") {
        baseQuery.status = "published";
      }
    } else {
      if (scope === "enrolled") {
        baseQuery["enrollments.student"] = user._id;
      } else {
        baseQuery.status = "published";
      }
    }

    if (category)
      baseQuery.category = new RegExp(`^${escapeRegex(category)}$`, "i");
    if (level) baseQuery.level = level;
    if (language) baseQuery.language = new RegExp(escapeRegex(language), "i");
    if (enrollmentMode && COURSE_ENROLLMENT_MODES.has(enrollmentMode))
      baseQuery.enrollmentMode = enrollmentMode;

    const fetchedCourses = await coursePopulate(
      Course.find(baseQuery).sort({ createdAt: -1 }),
    );
    const serializedCourses = fetchedCourses
      .map((course) => serializeCourseSummary(course, user))
      .filter(
        (course) =>
          !teacher ||
          course.teacher?.name?.toLowerCase().includes(teacher.toLowerCase()),
      );
    const filteredCourses = query
      ? serializedCourses
          .map((course) => ({
            ...course,
            _score: buildSearchScore(course, query),
          }))
          .filter((course) => course._score > 0)
      : serializedCourses.map((course) => ({ ...course, _score: 0 }));

    const sorters = {
      relevance: (a, b) =>
        b._score - a._score || new Date(b.updatedAt) - new Date(a.updatedAt),
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      popular: (a, b) =>
        b.approvedStudentCount - a.approvedStudentCount ||
        new Date(b.createdAt) - new Date(a.createdAt),
      title: (a, b) => a.title.localeCompare(b.title),
      upcoming: (a, b) => {
        const aDate = a.nextClass
          ? new Date(a.nextClass.scheduledStart).getTime()
          : Number.POSITIVE_INFINITY;
        const bDate = b.nextClass
          ? new Date(b.nextClass.scheduledStart).getTime()
          : Number.POSITIVE_INFINITY;
        return aDate - bDate || a.title.localeCompare(b.title);
      },
    };

    const sortedCourses = filteredCourses.sort(sorters[sort]);
    res.status(200).json({
      courses: sortedCourses
        .slice(0, limit)
        .map(({ _score, ...course }) => course),
      meta: {
        total: sortedCourses.length,
        sort,
        scope: scope || (assertTeacher(user) ? "mine" : "discover"),
        query,
        viewerRole: normalizeRole(user.role),
      },
    });
  } catch (error) {
    console.error("Error in getCourses controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getCourseById(req, res) {
  try {
    const course = await coursePopulate(Course.findById(req.params.id));
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const isOwner = isTeacherOwner(course, req.user._id.toString());
    if (
      !isOwner &&
      course.status !== "published" &&
      !findEnrollment(course, req.user._id.toString())
    ) {
      return res
        .status(403)
        .json({ message: "You do not have access to this course" });
    }

    res.status(200).json({ course: serializeCourseDetail(course, req.user) });
  } catch (error) {
    console.error("Error in getCourseById controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateCourse(req, res) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (!ensureCourseTeacher(course, req.user)) {
      return res
        .status(403)
        .json({ message: "Only the course teacher can update this course" });
    }

    const nextCode = normalizeText(req.body.code).toUpperCase();
    if (nextCode && nextCode !== course.code) {
      const existing = await Course.findOne({
        code: nextCode,
        _id: { $ne: course._id },
      });
      if (existing) {
        return res.status(409).json({ message: "Course code already exists" });
      }
      course.code = nextCode;
    }

    const updatableFields = [
      "title",
      "category",
      "shortDescription",
      "description",
    ];
    for (const field of updatableFields) {
      if (field in req.body) {
        const value = normalizeText(req.body[field]);
        if (value) course[field] = value;
      }
    }
    if ("language" in req.body) {
      const nextLanguage = getNormalizedSessionLanguage(req.body.language);
      if (!nextLanguage) {
        return res
          .status(400)
          .json({ message: "Choose a supported classroom language" });
      }
      course.language = nextLanguage;
    }
    if ("level" in req.body && COURSE_LEVELS.has(req.body.level)) {
      course.level = req.body.level;
    }
    if ("tags" in req.body) {
      course.tags = normalizeTags(req.body.tags);
    }
    if ("persistentRoomEnabled" in req.body) {
      course.persistentRoomEnabled = req.body.persistentRoomEnabled !== false;
    }
    if ("enrollmentMode" in req.body) {
      course.enrollmentMode = normalizeEnrollmentMode(req.body.enrollmentMode);
    }
    if ("inviteCode" in req.body) {
      course.inviteCode =
        normalizeText(req.body.inviteCode).toUpperCase() ||
        generateInviteCode();
    }

    const fieldLengthError = getCourseFieldLengthError({
      title: course.title,
      code: course.code,
      category: course.category,
      language: course.language,
      shortDescription: course.shortDescription,
      description: course.description,
    });
    if (fieldLengthError) {
      return res.status(400).json({ message: fieldLengthError });
    }

    await saveCourseWithRepair(course);
    const populatedCourse = await coursePopulate(Course.findById(course._id));
    res
      .status(200)
      .json({ course: serializeCourseDetail(populatedCourse, req.user) });
  } catch (error) {
    console.error("Error in updateCourse controller:", error.message);
    res.status(500).json({
      message:
        error?.name === "ValidationError"
          ? "Invalid course data"
          : "Internal Server Error",
    });
  }
}

export async function publishCourse(req, res) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!ensureCourseTeacher(course, req.user)) {
      return res
        .status(403)
        .json({ message: "Only the course teacher can publish this course" });
    }

    if (
      !course.title ||
      !course.code ||
      !course.category ||
      !course.language ||
      !course.shortDescription
    ) {
      return res
        .status(400)
        .json({ message: "Complete the course details before publishing" });
    }
    if (
      !course.persistentRoomEnabled &&
      (course.classSessions || []).length === 0
    ) {
      return res.status(400).json({
        message:
          "Enable the persistent room or schedule at least one class before publishing",
      });
    }

    course.status = "published";
    await saveCourseWithRepair(course);

    const populatedCourse = await coursePopulate(Course.findById(course._id));
    res.status(200).json({
      course: serializeCourseDetail(populatedCourse, req.user),
      message: "Course published successfully",
    });
  } catch (error) {
    console.error("Error in publishCourse controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function archiveCourse(req, res) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!ensureCourseTeacher(course, req.user)) {
      return res
        .status(403)
        .json({ message: "Only the course teacher can archive this course" });
    }

    course.status = "archived";
    await saveCourseWithRepair(course);

    const populatedCourse = await coursePopulate(Course.findById(course._id));
    res.status(200).json({
      course: serializeCourseDetail(populatedCourse, req.user),
      message: "Course archived",
    });
  } catch (error) {
    console.error("Error in archiveCourse controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function requestEnrollment(req, res) {
  try {
    if (assertTeacher(req.user)) {
      return res
        .status(403)
        .json({ message: "Teachers do not enroll in courses" });
    }

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (course.status !== "published") {
      return res.status(400).json({
        message: "Only published courses can accept enrollment requests",
      });
    }

    const existing = findEnrollment(course, req.user._id.toString());
    if (existing) {
      return res.status(200).json({
        message: `Enrollment is already ${existing.status}`,
        enrollmentStatus: existing.status,
      });
    }

    if (course.enrollmentMode === "invite") {
      return res.status(400).json({
        message: "This course requires an invite code",
        enrollmentStatus: "invite-required",
      });
    }

    course.enrollments.push({
      student: req.user._id,
      status: course.enrollmentMode === "open" ? "approved" : "pending",
      requestedAt: new Date(),
      decidedAt: course.enrollmentMode === "open" ? new Date() : null,
    });
    await saveCourseWithRepair(course);

    const enrollmentStatus =
      course.enrollmentMode === "open" ? "approved" : "pending";
    res.status(200).json({
      message:
        enrollmentStatus === "approved"
          ? "You joined the course successfully"
          : "Enrollment request submitted",
      enrollmentStatus,
    });
  } catch (error) {
    console.error("Error in requestEnrollment controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function joinCourseWithInvite(req, res) {
  try {
    if (assertTeacher(req.user)) {
      return res
        .status(403)
        .json({ message: "Teachers do not enroll in courses" });
    }

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (course.status !== "published") {
      return res
        .status(400)
        .json({ message: "Only published courses can be joined" });
    }
    if (course.enrollmentMode !== "invite") {
      return res
        .status(400)
        .json({ message: "This course does not require an invite code" });
    }

    const existing = findEnrollment(course, req.user._id.toString());
    if (existing) {
      return res.status(200).json({
        message: `Enrollment is already ${existing.status}`,
        enrollmentStatus: existing.status,
      });
    }

    const inviteCode = normalizeText(req.body.inviteCode).toUpperCase();
    if (!inviteCode || inviteCode !== course.inviteCode) {
      return res.status(400).json({ message: "Invalid invite code" });
    }

    course.enrollments.push({
      student: req.user._id,
      status: "approved",
      requestedAt: new Date(),
      decidedAt: new Date(),
    });
    await saveCourseWithRepair(course);

    res.status(200).json({
      message: "You joined the course successfully",
      enrollmentStatus: "approved",
    });
  } catch (error) {
    console.error("Error in joinCourseWithInvite controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function approveEnrollment(req, res) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!ensureCourseTeacher(course, req.user)) {
      return res
        .status(403)
        .json({ message: "Only the course teacher can approve enrollments" });
    }

    const enrollment = course.enrollments.id(req.params.enrollmentId);
    if (!enrollment)
      return res.status(404).json({ message: "Enrollment request not found" });

    enrollment.status = "approved";
    enrollment.decidedAt = new Date();
    await saveCourseWithRepair(course);

    const populatedCourse = await coursePopulate(Course.findById(course._id));
    res.status(200).json({
      course: serializeCourseDetail(populatedCourse, req.user),
      message: "Enrollment approved",
    });
  } catch (error) {
    console.error("Error in approveEnrollment controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function rejectEnrollment(req, res) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!ensureCourseTeacher(course, req.user)) {
      return res
        .status(403)
        .json({ message: "Only the course teacher can reject enrollments" });
    }

    const enrollment = course.enrollments.id(req.params.enrollmentId);
    if (!enrollment)
      return res.status(404).json({ message: "Enrollment request not found" });

    enrollment.status = "rejected";
    enrollment.decidedAt = new Date();
    await saveCourseWithRepair(course);

    const populatedCourse = await coursePopulate(Course.findById(course._id));
    res.status(200).json({
      course: serializeCourseDetail(populatedCourse, req.user),
      message: "Enrollment rejected",
    });
  } catch (error) {
    console.error("Error in rejectEnrollment controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function createClassSession(req, res) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!ensureCourseTeacher(course, req.user)) {
      return res
        .status(403)
        .json({ message: "Only the course teacher can schedule classes" });
    }

    const title = normalizeText(req.body.title);
    const description = normalizeText(req.body.description);
    const scheduledStart = req.body.scheduledStart
      ? new Date(req.body.scheduledStart)
      : null;
    const scheduledEnd = req.body.scheduledEnd
      ? new Date(req.body.scheduledEnd)
      : null;
    const sessionType = normalizeClassSessionType(req.body.sessionType);
    const usePersistentRoom =
      sessionType === "interactive" && req.body.usePersistentRoom === true;

    if (
      !title ||
      !scheduledStart ||
      !scheduledEnd ||
      Number.isNaN(scheduledStart.getTime()) ||
      Number.isNaN(scheduledEnd.getTime())
    ) {
      return res
        .status(400)
        .json({ message: "Title, start time, and end time are required" });
    }
    if (scheduledEnd <= scheduledStart) {
      return res
        .status(400)
        .json({ message: "Class end time must be after start time" });
    }

    course.classSessions.push({
      _id: new mongoose.Types.ObjectId(),
      title,
      description,
      scheduledStart,
      scheduledEnd,
      usePersistentRoom,
      sessionType,
      status: "scheduled",
    });
    await saveCourseWithRepair(course);

    const populatedCourse = await coursePopulate(Course.findById(course._id));
    res.status(201).json({
      course: serializeCourseDetail(populatedCourse, req.user),
      message: "Class scheduled successfully",
    });
  } catch (error) {
    console.error("Error in createClassSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateClassSession(req, res) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!ensureCourseTeacher(course, req.user)) {
      return res
        .status(403)
        .json({ message: "Only the course teacher can update classes" });
    }

    const classSession = course.classSessions.id(req.params.classId);
    if (!classSession)
      return res.status(404).json({ message: "Class session not found" });

    if ("title" in req.body)
      classSession.title = normalizeText(req.body.title) || classSession.title;
    if ("description" in req.body)
      classSession.description = normalizeText(req.body.description);
    if (
      "status" in req.body &&
      ["scheduled", "live", "completed", "cancelled"].includes(req.body.status)
    ) {
      classSession.status = req.body.status;
    }
    if ("sessionType" in req.body)
      classSession.sessionType = normalizeClassSessionType(
        req.body.sessionType,
      );
    if ("usePersistentRoom" in req.body)
      classSession.usePersistentRoom = req.body.usePersistentRoom === true;
    if (normalizeClassSessionType(classSession.sessionType) === "livestream")
      classSession.usePersistentRoom = false;
    if ("scheduledStart" in req.body)
      classSession.scheduledStart = new Date(req.body.scheduledStart);
    if ("scheduledEnd" in req.body)
      classSession.scheduledEnd = new Date(req.body.scheduledEnd);

    await saveCourseWithRepair(course);
    const populatedCourse = await coursePopulate(Course.findById(course._id));
    res.status(200).json({
      course: serializeCourseDetail(populatedCourse, req.user),
      message: "Class updated",
    });
  } catch (error) {
    console.error("Error in updateClassSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function startClassSession(req, res) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!ensureCourseTeacher(course, req.user)) {
      return res
        .status(403)
        .json({ message: "Only the course teacher can start classes" });
    }

    const classSession = course.classSessions.id(req.params.classId);
    if (!classSession)
      return res.status(404).json({ message: "Class session not found" });

    let session = null;
    if (classSession.usePersistentRoom && course.persistentSessionId) {
      session = await Session.findById(course.persistentSessionId);
    }
    if (!session && classSession.sessionId) {
      session = await Session.findById(classSession.sessionId);
    }

    if (!session || session.status !== "active") {
      session = await createRealtimeSession({
        hostUser: req.user,
        language: course.language,
        title: `${course.title} • ${classSession.title}`,
        sessionType: normalizeClassSessionType(classSession.sessionType),
        maxParticipants: Math.max(
          5,
          (course.enrollments || []).filter(
            (entry) => entry.status === "approved",
          ).length + 3,
        ),
        courseId: course._id,
        classSessionId: classSession._id,
        sessionKind: classSession.usePersistentRoom ? "course_room" : "class",
      });
    }

    classSession.sessionId = session._id;
    classSession.status = "live";
    classSession.startedAt = new Date();
    if (classSession.usePersistentRoom) {
      course.persistentSessionId = session._id;
    }
    await saveCourseWithRepair(course);

    const populatedCourse = await coursePopulate(Course.findById(course._id));
    res.status(200).json({
      course: serializeCourseDetail(populatedCourse, req.user),
      sessionId: session._id,
      message: "Class started successfully",
    });
  } catch (error) {
    console.error("Error in startClassSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function startPersistentRoom(req, res) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!ensureCourseTeacher(course, req.user)) {
      return res.status(403).json({
        message: "Only the course teacher can start the persistent room",
      });
    }
    if (!course.persistentRoomEnabled) {
      return res
        .status(400)
        .json({ message: "Persistent room is disabled for this course" });
    }

    let session = course.persistentSessionId
      ? await Session.findById(course.persistentSessionId)
      : null;
    if (!session || session.status !== "active") {
      session = await createRealtimeSession({
        hostUser: req.user,
        language: course.language,
        title: `${course.title} • Persistent Room`,
        sessionType: "group",
        maxParticipants: Math.max(
          5,
          (course.enrollments || []).filter(
            (entry) => entry.status === "approved",
          ).length + 3,
        ),
        courseId: course._id,
        sessionKind: "course_room",
      });
      course.persistentSessionId = session._id;
      await saveCourseWithRepair(course);
    }

    const populatedCourse = await coursePopulate(Course.findById(course._id));
    res.status(200).json({
      course: serializeCourseDetail(populatedCourse, req.user),
      sessionId: session._id,
      message: "Persistent room is ready",
    });
  } catch (error) {
    console.error("Error in startPersistentRoom controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function createAssignment(req, res) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!ensureCourseTeacher(course, req.user)) {
      return res
        .status(403)
        .json({ message: "Only the course teacher can create assignments" });
    }

    const title = normalizeText(req.body.title);
    const description = normalizeText(req.body.description);
    const dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
    if (!title || !dueDate || Number.isNaN(dueDate.getTime())) {
      return res
        .status(400)
        .json({ message: "Title and due date are required" });
    }

    course.assignments.push({
      _id: new mongoose.Types.ObjectId(),
      title,
      description,
      dueDate,
      status: "open",
      submissions: [],
    });
    await saveCourseWithRepair(course);

    const populatedCourse = await coursePopulate(Course.findById(course._id));
    res.status(201).json({
      course: serializeCourseDetail(populatedCourse, req.user),
      message: "Assignment created",
    });
  } catch (error) {
    console.error("Error in createAssignment controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function submitAssignment(req, res) {
  try {
    if (assertTeacher(req.user)) {
      return res
        .status(403)
        .json({ message: "Teachers cannot submit assignments" });
    }

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    const enrollment = ensureEnrolledStudent(course, req.user._id.toString(), [
      "approved",
    ]);
    if (!enrollment || enrollment.status !== "approved") {
      return res
        .status(403)
        .json({ message: "Only approved students can submit assignments" });
    }

    const assignment = course.assignments.id(req.params.assignmentId);
    if (!assignment)
      return res.status(404).json({ message: "Assignment not found" });
    if (assignment.status !== "open") {
      return res.status(400).json({ message: "This assignment is closed" });
    }

    const content = normalizeText(req.body.content);
    if (!content) {
      return res
        .status(400)
        .json({ message: "Submission content is required" });
    }

    const existingSubmission = (assignment.submissions || []).find(
      (entry) => entry.student?.toString() === req.user._id.toString(),
    );

    if (existingSubmission) {
      existingSubmission.content = content;
      existingSubmission.status = "submitted";
      existingSubmission.submittedAt = new Date();
      existingSubmission.feedback = "";
      existingSubmission.reviewedAt = null;
    } else {
      assignment.submissions.push({
        student: req.user._id,
        content,
        status: "submitted",
        submittedAt: new Date(),
      });
    }

    await saveCourseWithRepair(course);
    const populatedCourse = await coursePopulate(Course.findById(course._id));
    res.status(200).json({
      course: serializeCourseDetail(populatedCourse, req.user),
      message: "Assignment submitted",
    });
  } catch (error) {
    console.error("Error in submitAssignment controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function reviewAssignmentSubmission(req, res) {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (!ensureCourseTeacher(course, req.user)) {
      return res
        .status(403)
        .json({ message: "Only the course teacher can review submissions" });
    }

    const assignment = course.assignments.id(req.params.assignmentId);
    if (!assignment)
      return res.status(404).json({ message: "Assignment not found" });

    const submission = assignment.submissions.id(req.params.submissionId);
    if (!submission)
      return res.status(404).json({ message: "Submission not found" });

    submission.status = "reviewed";
    submission.feedback = normalizeText(req.body.feedback);
    submission.reviewedAt = new Date();
    await saveCourseWithRepair(course);

    const populatedCourse = await coursePopulate(Course.findById(course._id));
    res.status(200).json({
      course: serializeCourseDetail(populatedCourse, req.user),
      message: "Submission reviewed",
    });
  } catch (error) {
    console.error(
      "Error in reviewAssignmentSubmission controller:",
      error.message,
    );
    res.status(500).json({ message: "Internal Server Error" });
  }
}
