import Course from "../models/Course.js";
import LessonSnapshot from "../models/LessonSnapshot.js";
import Session from "../models/Session.js";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import { getSocketServer } from "../lib/socketServer.js";
import { provisionWorkspace } from "../lib/workspaceProvider.js";

const sanitizePath = (value) =>
  typeof value === "string"
    ? value
        .trim()
        .replace(/\\/g, "/")
        .replace(/^\/+/, "")
        .replace(/\.\./g, "")
    : "";

const sanitizeContent = (value) =>
  typeof value === "string" ? value.slice(0, 200_000) : "";

const isSessionHost = (session, userId) =>
  session?.host?.toString?.() === userId.toString() ||
  session?.hostId?.toString?.() === userId.toString();

const findApprovedEnrollment = (course, userId) =>
  (course?.enrollments || []).find(
    (entry) =>
      entry.status === "approved" &&
      (entry.student?._id?.toString?.() === userId ||
        entry.student?.toString?.() === userId),
  );

const canAccessSession = async (session, user) => {
  if (!session || !user) return false;
  if (isSessionHost(session, user._id)) return true;

  const participantIds = (session.participants || []).map((participant) =>
    participant?.toString?.() || participant?._id?.toString?.() || "",
  );
  if (participantIds.includes(user._id.toString())) return true;

  if (!session.courseId) return false;
  const course = await Course.findById(session.courseId).select(
    "teacher enrollments",
  );
  if (!course) return false;
  return Boolean(
    course.teacher?.toString() === user._id.toString() ||
      findApprovedEnrollment(course, user._id.toString()),
  );
};

const getSessionWithAccess = async (sessionId, user) => {
  const session = await Session.findById(sessionId)
    .populate("participants", "_id")
    .populate("host", "_id");
  if (!session) return { session: null, allowed: false };
  const allowed = await canAccessSession(session, user);
  return { session, allowed };
};

const serializeFiles = (files = []) =>
  files.map((file) => ({
    path: file.path,
    content: file.content,
    language: file.language,
    updatedAt: file.updatedAt,
  }));

const serializeWorkspace = (workspace, { includeFiles = true } = {}) => ({
  _id: workspace._id,
  ownerUserId: workspace.ownerUserId?._id || workspace.ownerUserId,
  owner:
    workspace.ownerUserId && typeof workspace.ownerUserId === "object"
      ? {
          _id: workspace.ownerUserId._id,
          name: workspace.ownerUserId.name,
          email: workspace.ownerUserId.email,
          profileImage: workspace.ownerUserId.profileImage,
          role: workspace.ownerUserId.role,
        }
      : undefined,
  sessionId: workspace.sessionId,
  courseId: workspace.courseId,
  role: workspace.role,
  workspaceKind: workspace.workspaceKind,
  generation: workspace.generation,
  templateId: workspace.templateId,
  providerType: workspace.providerType,
  providerWorkspaceId: workspace.providerWorkspaceId,
  status: workspace.status,
  followMode: workspace.followMode,
  baseSnapshotVersion: workspace.baseSnapshotVersion,
  lastAppliedLessonVersion: workspace.lastAppliedLessonVersion,
  activeFilePath: workspace.activeFilePath,
  rootPath: workspace.rootPath,
  embedUrl: workspace.embedUrl,
  files: includeFiles ? serializeFiles(workspace.files || []) : undefined,
  fileCount: (workspace.files || []).length,
  updatedAt: workspace.updatedAt,
});

const getLatestSnapshot = async (sessionId, generation) =>
  LessonSnapshot.findOne({ sessionId, generation }).sort({ lessonVersion: -1 });

const applySnapshotToWorkspace = async (workspace, snapshot) => {
  if (!snapshot) return workspace;
  workspace.files = snapshot.files.map((file) => ({
    path: file.path,
    content: file.content,
    language: file.language,
    updatedAt: new Date(),
  }));
  workspace.activeFilePath = snapshot.activeFilePath || workspace.activeFilePath;
  workspace.baseSnapshotVersion = snapshot.lessonVersion;
  workspace.lastAppliedLessonVersion = snapshot.lessonVersion;
  return workspace.save();
};

const emitSessionEvent = (sessionId, event, payload) => {
  const io = getSocketServer();
  if (!io) return;
  io.to(sessionId.toString()).emit(event, payload);
};

const createWorkspaceRecord = async ({
  session,
  user,
  role,
  generation,
  workspaceKind,
}) => {
  const provisioned = await provisionWorkspace({
    session,
    user,
    role,
    workspaceKind,
  });

  const workspace = await Workspace.create({
    ownerUserId: user._id,
    sessionId: session._id,
    courseId: session.courseId || null,
    role,
    workspaceKind,
    generation,
    templateId: provisioned.templateId,
    providerType: provisioned.providerType,
    providerWorkspaceId: provisioned.providerWorkspaceId,
    status: provisioned.status,
    followMode: role === "student",
    activeFilePath: provisioned.activeFilePath,
    files: provisioned.files,
    rootPath: "/workspace",
    embedUrl: provisioned.embedUrl,
    lastSeenAt: new Date(),
  });

  if (role === "student" && session.currentLessonVersion > 0) {
    const snapshot = await getLatestSnapshot(session._id, generation);
    if (snapshot) {
      return applySnapshotToWorkspace(workspace, snapshot);
    }
  }

  return workspace;
};

const ensureWorkspaceForUser = async (session, user) => {
  const role = isSessionHost(session, user._id) ? "teacher" : "student";
  let workspace = await Workspace.findOne({
    ownerUserId: user._id,
    sessionId: session._id,
    generation: session.workspaceGeneration,
  });

  if (!workspace) {
    workspace = await createWorkspaceRecord({
      session,
      user,
      role,
      generation: session.workspaceGeneration,
      workspaceKind:
        session.workspaceStrategy === "fresh-per-class" ? "fresh" : "persistent",
    });
  }

  workspace.lastSeenAt = new Date();
  await workspace.save();
  return workspace;
};

const getSessionStudentTargets = async (session) => {
  if (!session.courseId) {
    const participantIds = (session.participants || []).map((participant) =>
      participant._id?.toString?.() || participant.toString(),
    );
    return User.find({ _id: { $in: participantIds } });
  }

  const course = await Course.findById(session.courseId).populate(
    "enrollments.student",
    "_id name email profileImage role",
  );
  if (!course) return [];
  return (course.enrollments || [])
    .filter((entry) => entry.status === "approved" && entry.student)
    .map((entry) => entry.student);
};

export async function getMyWorkspace(req, res) {
  try {
    const { sessionId } = req.params;
    const { session, allowed } = await getSessionWithAccess(sessionId, req.user);

    if (!session) return res.status(404).json({ message: "Session not found" });
    if (!allowed) {
      return res.status(403).json({ message: "Not authorized for workspace access" });
    }

    const workspace = await ensureWorkspaceForUser(session, req.user);
    const latestSnapshot = await getLatestSnapshot(
      session._id,
      session.workspaceGeneration,
    );

    res.status(200).json({
      workspace: serializeWorkspace(workspace),
      lessonState: {
        generation: session.workspaceGeneration,
        currentLessonVersion: session.currentLessonVersion || 0,
        latestSnapshotAt: latestSnapshot?.createdAt || null,
      },
      sessionConfig: {
        ideMode: session.ideMode,
        isWorkspaceOpen: session.isWorkspaceOpen !== false,
        workspaceStrategy: session.workspaceStrategy,
      },
    });
  } catch (error) {
    console.error("Error in getMyWorkspace controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function listSessionWorkspaces(req, res) {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (!isSessionHost(session, req.user._id)) {
      return res.status(403).json({ message: "Only the host can view workspace roster" });
    }

    const workspaces = await Workspace.find({
      sessionId,
      generation: session.workspaceGeneration,
    }).populate("ownerUserId", "name email profileImage role");

    res.status(200).json({
      workspaces: workspaces.map((workspace) =>
        serializeWorkspace(workspace, { includeFiles: false }),
      ),
      lessonState: {
        generation: session.workspaceGeneration,
        currentLessonVersion: session.currentLessonVersion || 0,
      },
    });
  } catch (error) {
    console.error("Error in listSessionWorkspaces controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function bootstrapSessionWorkspaces(req, res) {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId)
      .populate("participants", "_id name email profileImage role")
      .populate("host", "_id name email profileImage role");
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (!isSessionHost(session, req.user._id)) {
      return res.status(403).json({ message: "Only the host can bootstrap workspaces" });
    }

    await ensureWorkspaceForUser(session, req.user);
    const targets = await getSessionStudentTargets(session);

    for (const student of targets) {
      await ensureWorkspaceForUser(session, student);
    }

    const workspaces = await Workspace.find({
      sessionId,
      generation: session.workspaceGeneration,
    }).populate("ownerUserId", "name email profileImage role");

    emitSessionEvent(sessionId, "workspace-roster-updated", {
      generation: session.workspaceGeneration,
      count: workspaces.length,
    });

    res.status(200).json({
      workspaces: workspaces.map((workspace) =>
        serializeWorkspace(workspace, { includeFiles: false }),
      ),
      message: "Workspaces are ready",
    });
  } catch (error) {
    console.error("Error in bootstrapSessionWorkspaces controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function createFreshWorkspaceSet(req, res) {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId)
      .populate("participants", "_id name email profileImage role")
      .populate("host", "_id name email profileImage role");
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (!isSessionHost(session, req.user._id)) {
      return res.status(403).json({ message: "Only the host can create fresh workspaces" });
    }

    session.workspaceGeneration += 1;
    session.currentLessonVersion = 0;
    await session.save();

    await createWorkspaceRecord({
      session,
      user: req.user,
      role: "teacher",
      generation: session.workspaceGeneration,
      workspaceKind: "fresh",
    });

    const targets = await getSessionStudentTargets(session);
    for (const student of targets) {
      await createWorkspaceRecord({
        session,
        user: student,
        role: "student",
        generation: session.workspaceGeneration,
        workspaceKind: "fresh",
      });
    }

    emitSessionEvent(sessionId, "workspace-generation-updated", {
      generation: session.workspaceGeneration,
      currentLessonVersion: 0,
    });

    res.status(201).json({
      generation: session.workspaceGeneration,
      message: "Fresh classroom workspaces created",
    });
  } catch (error) {
    console.error("Error in createFreshWorkspaceSet controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateWorkspaceFile(req, res) {
  try {
    const { id } = req.params;
    const path = sanitizePath(req.body.path);
    const content = sanitizeContent(req.body.content);
    const activeFilePath = sanitizePath(req.body.activeFilePath);

    const workspace = await Workspace.findById(id);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });
    if (workspace.ownerUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only edit your own workspace" });
    }

    const file = (workspace.files || []).find((entry) => entry.path === path);
    if (!file) return res.status(404).json({ message: "File not found" });

    file.content = content;
    file.updatedAt = new Date();
    if (activeFilePath) workspace.activeFilePath = activeFilePath;
    workspace.lastSeenAt = new Date();
    await workspace.save();

    res.status(200).json({ workspace: serializeWorkspace(workspace) });
  } catch (error) {
    console.error("Error in updateWorkspaceFile controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function createWorkspaceFile(req, res) {
  try {
    const { id } = req.params;
    const path = sanitizePath(req.body.path);
    const content = sanitizeContent(req.body.content);
    const language = typeof req.body.language === "string" ? req.body.language : "plaintext";

    if (!path) {
      return res.status(400).json({ message: "File path is required" });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });
    if (workspace.ownerUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only edit your own workspace" });
    }
    if ((workspace.files || []).some((entry) => entry.path === path)) {
      return res.status(409).json({ message: "A file already exists at this path" });
    }

    workspace.files.push({
      path,
      content,
      language,
      updatedAt: new Date(),
    });
    workspace.activeFilePath = path;
    workspace.lastSeenAt = new Date();
    await workspace.save();

    res.status(201).json({ workspace: serializeWorkspace(workspace) });
  } catch (error) {
    console.error("Error in createWorkspaceFile controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function deleteWorkspaceFile(req, res) {
  try {
    const { id } = req.params;
    const path = sanitizePath(req.query.path);

    const workspace = await Workspace.findById(id);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });
    if (workspace.ownerUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only edit your own workspace" });
    }

    workspace.files = (workspace.files || []).filter((file) => file.path !== path);
    if (workspace.activeFilePath === path) {
      workspace.activeFilePath = workspace.files[0]?.path || "";
    }
    workspace.lastSeenAt = new Date();
    await workspace.save();

    res.status(200).json({ workspace: serializeWorkspace(workspace) });
  } catch (error) {
    console.error("Error in deleteWorkspaceFile controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function publishLessonSnapshot(req, res) {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (!isSessionHost(session, req.user._id)) {
      return res.status(403).json({ message: "Only the host can publish lesson state" });
    }

    const teacherWorkspace = await Workspace.findOne({
      ownerUserId: req.user._id,
      sessionId,
      generation: session.workspaceGeneration,
    });
    if (!teacherWorkspace) {
      return res.status(404).json({ message: "Teacher workspace not found" });
    }

    const lessonVersion = (session.currentLessonVersion || 0) + 1;
    const snapshot = await LessonSnapshot.create({
      sessionId: session._id,
      courseId: session.courseId || null,
      teacherWorkspaceId: teacherWorkspace._id,
      generation: session.workspaceGeneration,
      lessonVersion,
      templateId: teacherWorkspace.templateId,
      activeFilePath: teacherWorkspace.activeFilePath,
      files: serializeFiles(teacherWorkspace.files || []),
      createdBy: req.user._id,
    });

    session.currentLessonVersion = lessonVersion;
    await session.save();

    const followerWorkspaces = await Workspace.find({
      sessionId,
      generation: session.workspaceGeneration,
      role: "student",
      followMode: true,
    });

    for (const workspace of followerWorkspaces) {
      await applySnapshotToWorkspace(workspace, snapshot);
    }

    emitSessionEvent(sessionId, "lesson-version-published", {
      generation: session.workspaceGeneration,
      lessonVersion,
      autoAppliedCount: followerWorkspaces.length,
    });

    res.status(201).json({
      lessonVersion,
      snapshotId: snapshot._id,
      autoAppliedCount: followerWorkspaces.length,
      message: "Lesson snapshot published",
    });
  } catch (error) {
    console.error("Error in publishLessonSnapshot controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function setWorkspaceFollowMode(req, res) {
  try {
    const { id } = req.params;
    const nextMode = req.body.followMode === true;
    const workspace = await Workspace.findById(id);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });
    if (workspace.ownerUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only update your own workspace" });
    }

    workspace.followMode = nextMode;
    await workspace.save();

    if (nextMode) {
      const snapshot = await getLatestSnapshot(
        workspace.sessionId,
        workspace.generation,
      );
      if (snapshot && workspace.lastAppliedLessonVersion < snapshot.lessonVersion) {
        await applySnapshotToWorkspace(workspace, snapshot);
      }
    }

    emitSessionEvent(workspace.sessionId, "workspace-follow-state-changed", {
      workspaceId: workspace._id,
      ownerUserId: workspace.ownerUserId,
      followMode: workspace.followMode,
    });

    res.status(200).json({ workspace: serializeWorkspace(workspace) });
  } catch (error) {
    console.error("Error in setWorkspaceFollowMode controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function resyncWorkspace(req, res) {
  try {
    const { id } = req.params;
    const workspace = await Workspace.findById(id);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const session = await Session.findById(workspace.sessionId);
    const isOwner = workspace.ownerUserId.toString() === req.user._id.toString();
    const isHost = session && isSessionHost(session, req.user._id);
    if (!isOwner && !isHost) {
      return res.status(403).json({ message: "Not allowed to resync this workspace" });
    }

    const snapshot = await getLatestSnapshot(workspace.sessionId, workspace.generation);
    if (!snapshot) {
      return res.status(404).json({ message: "No lesson snapshot is available yet" });
    }

    await applySnapshotToWorkspace(workspace, snapshot);

    emitSessionEvent(workspace.sessionId, "workspace-resynced", {
      workspaceId: workspace._id,
      ownerUserId: workspace.ownerUserId,
      lessonVersion: snapshot.lessonVersion,
    });

    res.status(200).json({
      workspace: serializeWorkspace(workspace),
      lessonVersion: snapshot.lessonVersion,
      message: "Workspace resynced",
    });
  } catch (error) {
    console.error("Error in resyncWorkspace controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function forceResyncFollowers(req, res) {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (!isSessionHost(session, req.user._id)) {
      return res.status(403).json({ message: "Only the host can force resync" });
    }

    const snapshot = await getLatestSnapshot(sessionId, session.workspaceGeneration);
    if (!snapshot) {
      return res.status(404).json({ message: "No lesson snapshot is available yet" });
    }

    const workspaces = await Workspace.find({
      sessionId,
      generation: session.workspaceGeneration,
      role: "student",
    });

    for (const workspace of workspaces) {
      await applySnapshotToWorkspace(workspace, snapshot);
    }

    emitSessionEvent(sessionId, "lesson-force-resynced", {
      lessonVersion: snapshot.lessonVersion,
      count: workspaces.length,
    });

    res.status(200).json({
      lessonVersion: snapshot.lessonVersion,
      resyncedCount: workspaces.length,
      message: "Followers resynced",
    });
  } catch (error) {
    console.error("Error in forceResyncFollowers controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
