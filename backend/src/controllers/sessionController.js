import { chatClient, streamClient } from "../lib/stream.js";
import Course from "../models/Course.js";
import Session from "../models/Session.js";
import { quizStateByRoom, whiteboardPersistTimersByRoom, whiteboardStateByRoom } from "../server.js";
import { saveCourseWithRepair } from "../lib/coursePersistence.js";
import { getNormalizedSessionLanguage, getSessionLanguageLabel } from "../lib/sessionLanguage.js";

const isTeacher = (user) => user?.role === "teacher";

const findApprovedEnrollment = (course, userId) =>
  (course.enrollments || []).find(
    (entry) =>
      entry.status === "approved" &&
      (entry.student?._id?.toString?.() === userId || entry.student?.toString?.() === userId),
  );

const canJoinCourseSession = (course, user) => {
  if (!course || !user) return false;
  if (course.teacher?._id?.toString?.() === user._id.toString() || course.teacher?.toString?.() === user._id.toString()) {
    return true;
  }
  return Boolean(findApprovedEnrollment(course, user._id.toString()));
};

const markCourseAttendanceJoin = async (session, userId) => {
  if (!session.courseId || !session.classSessionId) return;

  const course = await Course.findById(session.courseId);
  if (!course) return;

  const classSession = course.classSessions.id(session.classSessionId);
  if (!classSession) return;

  const alreadyTracked = (classSession.attendance || []).some(
    (entry) => entry.student?.toString() === userId.toString(),
  );

  if (!alreadyTracked) {
    classSession.attendance.push({
      student: userId,
      status: "joined",
      joinedAt: new Date(),
    });
    await saveCourseWithRepair(course);
  }
};

const completeLinkedCourseClass = async (session) => {
  if (!session.courseId || !session.classSessionId) return;

  const course = await Course.findById(session.courseId);
  if (!course) return;

  const classSession = course.classSessions.id(session.classSessionId);
  if (!classSession) return;

  classSession.status = "completed";
  classSession.endedAt = new Date();
  for (const attendance of classSession.attendance || []) {
    if (!attendance.leftAt) {
      attendance.leftAt = classSession.endedAt;
      const durationMs = attendance.leftAt.getTime() - new Date(attendance.joinedAt).getTime();
      attendance.durationMinutes = Math.max(0, Math.round(durationMs / 60000));
      attendance.status = "completed";
    }
  }

  await saveCourseWithRepair(course);
};

export async function createSession(req, res) {
  try {
    const {
      language,
      sessionType = "one-on-one",
      maxParticipants,
      title = "",
      courseId = null,
      classSessionId = null,
      sessionKind = "ad_hoc",
    } = req.body;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;
    const normalizedLanguage = getNormalizedSessionLanguage(language);

    if (!normalizedLanguage) {
      return res.status(400).json({ message: "Choose a supported coding language" });
    }

    let participantLimit;
    if (sessionType === "group") {
      const parsedMax = parseInt(maxParticipants, 10);
      participantLimit = Number.isNaN(parsedMax) || parsedMax < 2 || parsedMax > 200 ? 10 : parsedMax;
    } else {
      participantLimit = 1;
    }

    if (courseId) {
      const course = await Course.findById(courseId);
      if (!course) return res.status(404).json({ message: "Course not found" });
      if (!isTeacher(req.user) || course.teacher.toString() !== userId.toString()) {
        return res.status(403).json({ message: "Only the course teacher can create course live sessions" });
      }
    }

    const callId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const session = await Session.create({
      language: normalizedLanguage,
      host: userId,
      callId,
      code,
      sessionType,
      maxParticipants: participantLimit,
      participants: [],
      title,
      courseId,
      classSessionId,
      sessionKind,
    });

    await streamClient.video.call("default", callId).getOrCreate({
      data: {
        created_by_id: clerkId,
        custom: {
          language: normalizedLanguage,
          sessionId: session._id.toString(),
          courseId,
          classSessionId,
          sessionKind,
        },
      },
    });

    const channel = chatClient.channel("messaging", callId, {
      name: title || `${getSessionLanguageLabel(normalizedLanguage)} Session`,
      created_by_id: clerkId,
      members: [clerkId],
    });

    await channel.create();

    res.status(201).json({ session });
  } catch (error) {
    console.log("Error in createSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getActiveSessions(_, res) {
  try {
    const sessions = await Session.find({ status: "active", sessionKind: "ad_hoc" })
      .populate("host", "name profileImage email clerkId role")
      .populate("participants", "name profileImage email clerkId role")
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions });
  } catch (error) {
    console.log("Error in getActiveSessions controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyRecentSessions(req, res) {
  try {
    const userId = req.user._id;

    const sessions = await Session.find({
      status: "completed",
      $or: [{ host: userId }, { participants: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions });
  } catch (error) {
    console.log("Error in getMyRecentSessions controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getSessionById(req, res) {
  try {
    const { id } = req.params;

    const session = await Session.findById(id)
      .populate("host", "name email profileImage clerkId role")
      .populate("participants", "name email profileImage clerkId role")
      .populate("courseId", "title code teacher enrollments")
      .lean();

    if (!session) return res.status(404).json({ message: "Session not found" });

    let courseAccess = null;
    if (session.courseId) {
      const isTeacherOwner = session.courseId.teacher?.toString?.() === req.user._id.toString();
      const approvedEnrollment = (session.courseId.enrollments || []).find(
        (entry) =>
          entry.status === "approved" && entry.student?.toString?.() === req.user._id.toString(),
      );

      if (!isTeacherOwner && !approvedEnrollment && session.host?.clerkId !== req.user.clerkId) {
        return res.status(403).json({ message: "You are not approved to access this course session" });
      }

      courseAccess = {
        courseId: session.courseId._id,
        courseTitle: session.courseId.title,
        canJoinWithoutCode: Boolean(isTeacherOwner || approvedEnrollment),
      };
    }

    res.status(200).json({ session: { ...session, courseAccess } });
  } catch (error) {
    console.log("Error in getSessionById controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function joinSession(req, res) {
  try {
    const { id } = req.params;
    const { code } = req.body;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.status !== "active") {
      return res.status(400).json({ message: "Cannot join a completed session" });
    }

    let canJoinWithoutCode = false;
    if (session.courseId) {
      const course = await Course.findById(session.courseId).populate("teacher", "_id");
      if (!course || !canJoinCourseSession(course, req.user)) {
        return res.status(403).json({ message: "You are not approved to join this live class" });
      }
      canJoinWithoutCode = true;
    }

    if (!canJoinWithoutCode && session.code !== code) {
      return res.status(400).json({ message: "Invalid access code" });
    }

    if (session.host.toString() === userId.toString()) {
      return res.status(400).json({ message: "Host cannot join as a participant" });
    }

    const isAlreadyJoined = session.participants.some((p) => p.toString() === userId.toString());
    if (isAlreadyJoined) {
      return res.status(200).json({ session });
    }

    if (session.participants.length >= session.maxParticipants) {
      return res.status(409).json({ message: "Session is full" });
    }

    session.participants.push(userId);
    await session.save();
    await markCourseAttendanceJoin(session, userId);

    const channel = chatClient.channel("messaging", session.callId);
    await channel.addMembers([clerkId]);

    res.status(200).json({ session });
  } catch (error) {
    console.log("Error in joinSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function joinSessionByCode(req, res) {
  try {
    const code = typeof req.body.code === "string" ? req.body.code.trim().toUpperCase() : "";
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    if (!code) {
      return res.status(400).json({ message: "Access code is required" });
    }

    const session = await Session.findOne({ code, status: "active" });

    if (!session) {
      return res.status(404).json({ message: "No active session found for this code" });
    }

    if (session.courseId) {
      const course = await Course.findById(session.courseId).populate("teacher", "_id");
      if (!course || !canJoinCourseSession(course, req.user)) {
        return res.status(403).json({ message: "You are not approved to join this live class" });
      }
    }

    if (session.host.toString() === userId.toString()) {
      return res.status(200).json({ sessionId: session._id, session });
    }

    const isAlreadyJoined = session.participants.some((participantId) => participantId.toString() === userId.toString());

    if (!isAlreadyJoined) {
      if (session.participants.length >= session.maxParticipants) {
        return res.status(409).json({ message: "Session is full" });
      }

      session.participants.push(userId);
      await session.save();
      await markCourseAttendanceJoin(session, userId);

      const channel = chatClient.channel("messaging", session.callId);
      await channel.addMembers([clerkId]);
    }

    res.status(200).json({ sessionId: session._id, session });
  } catch (error) {
    console.log("Error in joinSessionByCode controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function kickParticipant(req, res) {
  try {
    const { id } = req.params;
    const { participantId } = req.body;
    const userId = req.user._id;

    const session = await Session.findById(id).populate("participants");

    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.host.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the host can kick a participant" });
    }

    const targetUser = session.participants.find((p) => p._id.toString() === participantId);
    if (!targetUser) {
      return res.status(404).json({ message: "Participant not found in session" });
    }

    if (targetUser.clerkId) {
      try {
        const channel = chatClient.channel("messaging", session.callId);
        await channel.removeMembers([targetUser.clerkId]);
      } catch (streamError) {
        console.log("Error removing from Stream:", streamError.message);
      }
    }

    session.participants = session.participants.filter((p) => p._id.toString() !== participantId);
    await session.save();

    res.status(200).json({ message: "Participant kicked successfully", session });
  } catch (error) {
    console.log("Error in kickParticipant controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function endSession(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.host.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the host can end the session" });
    }
    if (session.status === "completed") {
      return res.status(400).json({ message: "Session is already completed" });
    }

    const call = streamClient.video.call("default", session.callId);
    await call.delete({ hard: true });

    const channel = chatClient.channel("messaging", session.callId);
    await channel.delete();

    session.status = "completed";
    await session.save();
    await completeLinkedCourseClass(session);

    const whiteboardPersistTimer = whiteboardPersistTimersByRoom.get(id);
    if (whiteboardPersistTimer) clearTimeout(whiteboardPersistTimer);
    whiteboardPersistTimersByRoom.delete(id);
    whiteboardStateByRoom.delete(id);
    const quizState = quizStateByRoom.get(id);
    if (quizState?.activeTimer) clearTimeout(quizState.activeTimer);
    quizStateByRoom.delete(id);

    res.status(200).json({ session, message: "Session ended successfully" });
  } catch (error) {
    console.log("Error in endSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
