import Course from "../models/Course.js";
import User from "../models/User.js";

const normalizeRole = (value) => (value === "teacher" ? "teacher" : "student");
const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeStringList = (value) => {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return [...new Set(list.map((entry) => normalizeText(entry)).filter(Boolean))].slice(0, 12);
};

const buildTeacherStats = async (teacherId) => {
  const courses = await Course.find({ teacher: teacherId, status: "published" }).select("classSessions enrollments");
  const now = Date.now();

  return {
    publishedCourseCount: courses.length,
    activeStudentCount: courses.reduce(
      (sum, course) => sum + (course.enrollments || []).filter((entry) => entry.status === "approved").length,
      0,
    ),
    upcomingClassCount: courses.reduce(
      (sum, course) =>
        sum +
        (course.classSessions || []).filter(
          (entry) =>
            (entry.status === "scheduled" || entry.status === "live") &&
            new Date(entry.scheduledEnd).getTime() >= now,
        ).length,
      0,
    ),
  };
};

const serializeProfile = (user, stats = null) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  profileImage: user.profileImage,
  role: normalizeRole(user.role),
  roleLocked: Boolean(user.onboardingCompleted),
  onboardingCompleted: Boolean(user.onboardingCompleted),
  headline: user.headline || "",
  bio: user.bio || "",
  subjects: user.subjects || [],
  languagesSpoken: user.languagesSpoken || [],
  availabilityNote: user.availabilityNote || "",
  profileVisible: user.profileVisible !== false,
  stats,
});

export async function getCurrentUser(req, res) {
  try {
    const stats = req.user.role === "teacher" ? await buildTeacherStats(req.user._id) : null;
    res.status(200).json({ profile: serializeProfile(req.user, stats) });
  } catch (error) {
    console.error("Error in getCurrentUser controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function completeOnboarding(req, res) {
  try {
    if (req.user.onboardingCompleted) {
      return res.status(409).json({ message: "Onboarding has already been completed" });
    }

    req.user.role = normalizeRole(req.body.role);
    req.user.onboardingCompleted = true;
    req.user.headline = normalizeText(req.body.headline);
    req.user.bio = normalizeText(req.body.bio);
    req.user.subjects = normalizeStringList(req.body.subjects);
    req.user.languagesSpoken = normalizeStringList(req.body.languagesSpoken);
    req.user.availabilityNote = normalizeText(req.body.availabilityNote);
    req.user.profileVisible = req.body.profileVisible !== false;

    await req.user.save();

    const stats = req.user.role === "teacher" ? await buildTeacherStats(req.user._id) : null;
    res.status(200).json({ profile: serializeProfile(req.user, stats), message: "Onboarding completed" });
  } catch (error) {
    console.error("Error in completeOnboarding controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateRole(req, res) {
  try {
    if (req.user.onboardingCompleted) {
      return res.status(403).json({ message: "Role is locked after onboarding" });
    }

    req.user.role = normalizeRole(req.body.role);
    req.user.onboardingCompleted = true;
    await req.user.save();

    const stats = req.user.role === "teacher" ? await buildTeacherStats(req.user._id) : null;
    res.status(200).json({ profile: serializeProfile(req.user, stats), message: "Role updated" });
  } catch (error) {
    console.error("Error in updateRole controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function updateProfile(req, res) {
  try {
    if ("headline" in req.body) req.user.headline = normalizeText(req.body.headline);
    if ("bio" in req.body) req.user.bio = normalizeText(req.body.bio);
    if ("availabilityNote" in req.body) req.user.availabilityNote = normalizeText(req.body.availabilityNote);
    if ("subjects" in req.body) req.user.subjects = normalizeStringList(req.body.subjects);
    if ("languagesSpoken" in req.body) req.user.languagesSpoken = normalizeStringList(req.body.languagesSpoken);
    if ("profileVisible" in req.body) req.user.profileVisible = req.body.profileVisible !== false;

    await req.user.save();

    const stats = req.user.role === "teacher" ? await buildTeacherStats(req.user._id) : null;
    res.status(200).json({ profile: serializeProfile(req.user, stats), message: "Profile updated" });
  } catch (error) {
    console.error("Error in updateProfile controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getTeachers(req, res) {
  try {
    const q = normalizeText(req.query.q).toLowerCase();
    const subject = normalizeText(req.query.subject);
    const language = normalizeText(req.query.language);

    const baseQuery = { role: "teacher", onboardingCompleted: true, profileVisible: true };
    if (subject) baseQuery.subjects = new RegExp(escapeRegex(subject), "i");
    if (language) baseQuery.languagesSpoken = new RegExp(escapeRegex(language), "i");

    const teachers = await User.find(baseQuery).sort({ updatedAt: -1 }).limit(60);
    const filteredTeachers = q
      ? teachers.filter((teacher) =>
          [
            teacher.name,
            teacher.headline,
            teacher.bio,
            ...(teacher.subjects || []),
            ...(teacher.languagesSpoken || []),
          ]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : teachers;

    const items = await Promise.all(
      filteredTeachers.map(async (teacher) => serializeProfile(teacher, await buildTeacherStats(teacher._id))),
    );

    res.status(200).json({ teachers: items });
  } catch (error) {
    console.error("Error in getTeachers controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getTeacherById(req, res) {
  try {
    const teacher = await User.findOne({
      _id: req.params.id,
      role: "teacher",
      onboardingCompleted: true,
      profileVisible: true,
    });

    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    const stats = await buildTeacherStats(teacher._id);
    const courses = await Course.find({ teacher: teacher._id, status: "published" })
      .sort({ updatedAt: -1 })
      .limit(12)
      .select("title code shortDescription category language level tags status enrollmentMode");

    res.status(200).json({
      teacher: serializeProfile(teacher, stats),
      courses,
    });
  } catch (error) {
    console.error("Error in getTeacherById controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
