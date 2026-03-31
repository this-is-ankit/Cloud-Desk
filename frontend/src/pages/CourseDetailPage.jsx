import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { format } from "date-fns";
import { ArrowLeft, Loader2, RadioTower } from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  useApproveEnrollment,
  useArchiveCourse,
  useCourseById,
  useCreateAssignment,
  useCreateClassSession,
  usePublishCourse,
  useJoinCourseWithInvite,
  useRejectEnrollment,
  useRequestEnrollment,
  useReviewAssignmentSubmission,
  useStartClassSession,
  useStartPersistentRoom,
  useSubmitAssignment,
  useUpdateCourse,
} from "../hooks/useCourses";
import { useAppUser } from "../hooks/useAppUser";
import {
  getSessionLanguageLabel,
  normalizeSessionLanguage,
  SESSION_LANGUAGE_OPTIONS,
} from "../lib/sessionLanguage";
import PageContainer from "../components/PageContainer";

const INITIAL_CLASS_FORM = {
  title: "",
  description: "",
  scheduledStart: "",
  scheduledEnd: "",
  usePersistentRoom: false,
};

const INITIAL_ASSIGNMENT_FORM = {
  title: "",
  description: "",
  dueDate: "",
};

function CourseDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isTeacher } = useAppUser();

  const courseQuery = useCourseById(id);
  const updateCourseMutation = useUpdateCourse();
  const publishCourseMutation = usePublishCourse();
  const archiveCourseMutation = useArchiveCourse();
  const requestEnrollmentMutation = useRequestEnrollment();
  const joinCourseWithInviteMutation = useJoinCourseWithInvite();
  const approveEnrollmentMutation = useApproveEnrollment();
  const rejectEnrollmentMutation = useRejectEnrollment();
  const createClassSessionMutation = useCreateClassSession();
  const startClassSessionMutation = useStartClassSession();
  const startPersistentRoomMutation = useStartPersistentRoom();
  const createAssignmentMutation = useCreateAssignment();
  const submitAssignmentMutation = useSubmitAssignment();
  const reviewAssignmentMutation = useReviewAssignmentSubmission();

  const course = courseQuery.data?.course;
  const [classForm, setClassForm] = useState(INITIAL_CLASS_FORM);
  const [assignmentForm, setAssignmentForm] = useState(INITIAL_ASSIGNMENT_FORM);
  const [submissionDrafts, setSubmissionDrafts] = useState({});
  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  const [editForm, setEditForm] = useState(null);
  const [inviteCode, setInviteCode] = useState("");

  const canManage = Boolean(course?.canManage && isTeacher);
  const approvedClasses = useMemo(
    () => (course?.classSessions || []).filter((entry) => entry.status !== "cancelled"),
    [course?.classSessions],
  );

  const handleCourseFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setEditForm((current) => ({
      ...(current || {
        title: course.title,
        code: course.code,
        category: course.category,
        language: normalizeSessionLanguage(course.language),
        level: course.level,
        shortDescription: course.shortDescription,
        description: course.description,
        tags: course.tags.join(", "),
        persistentRoomEnabled: course.persistentRoomEnabled,
        enrollmentMode: course.enrollmentMode,
        inviteCode: course.inviteCode || "",
      }),
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSaveCourse = () => {
    if (!course) return;
    updateCourseMutation.mutate({ courseId: course._id, data: editForm || {} });
  };

  const handleCreateClass = (event) => {
    event.preventDefault();
    if (!course) return;
    createClassSessionMutation.mutate(
      {
        courseId: course._id,
        data: classForm,
      },
      {
        onSuccess: () => setClassForm(INITIAL_CLASS_FORM),
      },
    );
  };

  const handleCreateAssignment = (event) => {
    event.preventDefault();
    if (!course) return;
    createAssignmentMutation.mutate(
      {
        courseId: course._id,
        data: assignmentForm,
      },
      {
        onSuccess: () => setAssignmentForm(INITIAL_ASSIGNMENT_FORM),
      },
    );
  };

  if (courseQuery.isLoading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-base-200">
        <Navbar />
        <div className="mx-auto w-full max-w-[1180px] px-4 py-10 md:px-6">
          <div className="rounded-[2rem] border border-dashed border-base-content/15 bg-base-100/70 px-6 py-20 text-center">
            <h1 className="text-3xl font-black">Course not found</h1>
            <button className="btn btn-primary mt-6 rounded-2xl" onClick={() => navigate("/courses")}>
              Back to Courses
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar />

      <PageContainer className="py-10">
        <button className="btn btn-ghost mb-6 rounded-2xl" onClick={() => navigate("/courses")}>
          <ArrowLeft className="size-4" />
          Back to Courses
        </button>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[2rem] border border-base-content/10 bg-gradient-to-br from-base-100 via-base-100 to-primary/5 p-7 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">{course.code}</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight">{course.title}</h1>
              </div>
              <span className="badge badge-outline">{course.status}</span>
            </div>

            <p className="mt-5 text-base leading-7 text-base-content/75">{course.shortDescription}</p>

            <div className="mt-8 flex flex-wrap gap-2">
              <span className="badge badge-ghost">{course.category}</span>
              <span className="badge badge-ghost">{getSessionLanguageLabel(course.language)}</span>
              {course.tags.map((tag) => (
                <span key={tag} className="badge badge-outline">
                  {tag}
                </span>
              ))}
            </div>

            {course.description && (
              <div className="mt-8">
                <h2 className="text-xl font-bold">About this course</h2>
                <p className="mt-3 whitespace-pre-wrap text-base-content/72">{course.description}</p>
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-base-content/10 bg-base-100/90 p-6 shadow-sm">
              <h2 className="text-xl font-bold">{canManage ? "Teacher controls" : "Course access"}</h2>
              <div className="mt-5 space-y-3 text-sm text-base-content/70">
                <p>Teacher: {course.teacher?.name || "Unknown"}</p>
                <p>Approved students: {course.approvedStudentCount}</p>
                <p>Enrollment mode: {course.enrollmentMode}</p>
                <p>Persistent room: {course.persistentRoomEnabled ? "enabled" : "disabled"}</p>
                {!canManage && <p>Your enrollment: {course.myEnrollment?.status || "not requested"}</p>}
                {canManage && course.inviteCode && <p>Invite code: {course.inviteCode}</p>}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {canManage ? (
                  <>
                    <button
                      className="btn btn-primary rounded-2xl"
                      onClick={() =>
                        startPersistentRoomMutation.mutate(course._id, {
                          onSuccess: (data) => navigate(`/session/${data.sessionId}`),
                        })
                      }
                      disabled={startPersistentRoomMutation.isPending}
                    >
                      <RadioTower className="size-4" />
                      Launch Persistent Room
                    </button>
                    {course.status !== "published" && (
                      <button
                        className="btn btn-outline rounded-2xl"
                        onClick={() => publishCourseMutation.mutate(course._id)}
                        disabled={publishCourseMutation.isPending}
                      >
                        Publish Course
                      </button>
                    )}
                    {course.status !== "archived" && (
                      <button
                        className="btn btn-outline rounded-2xl"
                        onClick={() => archiveCourseMutation.mutate(course._id)}
                        disabled={archiveCourseMutation.isPending}
                      >
                        Archive
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {course.enrollmentMode === "invite" && !course.myEnrollment ? (
                      <>
                        <input
                          className="input input-bordered rounded-2xl w-full uppercase"
                          value={inviteCode}
                          onChange={(event) => setInviteCode(event.target.value)}
                          placeholder="Enter invite code"
                        />
                        <button
                          className="btn btn-primary rounded-2xl"
                          onClick={() => joinCourseWithInviteMutation.mutate({ courseId: course._id, inviteCode })}
                          disabled={joinCourseWithInviteMutation.isPending}
                        >
                          Join with Invite
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-primary rounded-2xl"
                        onClick={() => requestEnrollmentMutation.mutate(course._id)}
                        disabled={Boolean(course.myEnrollment) || requestEnrollmentMutation.isPending}
                      >
                        {course.myEnrollment
                          ? `Enrollment ${course.myEnrollment.status}`
                          : course.enrollmentMode === "open"
                            ? "Join Course"
                            : "Request Enrollment"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-base-content/10 bg-base-100/90 p-6 shadow-sm">
              <h2 className="text-xl font-bold">Live classes</h2>
              <div className="mt-5 space-y-4">
                {approvedClasses.length > 0 ? (
                  approvedClasses.map((entry) => (
                    <div key={entry._id} className="rounded-2xl border border-base-content/10 bg-base-200/30 p-4">
                      <h3 className="font-semibold">{entry.title}</h3>
                      <p className="mt-1 text-xs text-base-content/60">
                        {format(new Date(entry.scheduledStart), "MMM d, yyyy p")} to {format(new Date(entry.scheduledEnd), "p")}
                      </p>
                      {entry.description && <p className="mt-2 text-sm text-base-content/70">{entry.description}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="badge badge-outline">{entry.status}</span>
                        <span className="badge badge-ghost">{entry.attendanceCount} attendance records</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        {canManage && (
                          <button
                            className="btn btn-primary btn-sm rounded-xl"
                            onClick={() =>
                              startClassSessionMutation.mutate(
                                { courseId: course._id, classId: entry._id },
                                {
                                  onSuccess: (data) => navigate(`/session/${data.sessionId}`),
                                },
                              )
                            }
                            disabled={startClassSessionMutation.isPending}
                          >
                            {entry.status === "live" ? "Reopen Live Room" : "Start Class"}
                          </button>
                        )}
                        {!canManage && entry.status === "live" && entry.sessionId && (
                          <button className="btn btn-primary btn-sm rounded-xl" onClick={() => navigate(`/session/${entry.sessionId}`)}>
                            Join Live Class
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-base-content/60">No live classes scheduled yet.</p>
                )}
              </div>
            </div>
          </aside>
        </div>

        {canManage && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-[2rem] border border-base-content/10 bg-base-100/90 p-6 shadow-sm">
              <h2 className="text-xl font-bold">Course settings</h2>
              <div className="mt-5 grid gap-4">
                {[
                  ["title", "Course title", course.title],
                  ["code", "Course code", course.code],
                  ["category", "Category", course.category],
                ].map(([name, label, value]) => (
                  <label key={name} className="form-control">
                    <span className="mb-2 text-sm font-medium">{label}</span>
                    <input
                      name={name}
                      defaultValue={value}
                      onChange={handleCourseFieldChange}
                      className="input input-bordered rounded-2xl"
                    />
                  </label>
                ))}
                <label className="form-control">
                  <span className="mb-2 text-sm font-medium">Language</span>
                  <select
                    name="language"
                    defaultValue={normalizeSessionLanguage(course.language)}
                    onChange={handleCourseFieldChange}
                    className="select select-bordered rounded-2xl"
                  >
                    {SESSION_LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-control">
                  <span className="mb-2 text-sm font-medium">Level</span>
                  <select name="level" defaultValue={course.level} onChange={handleCourseFieldChange} className="select select-bordered rounded-2xl">
                    <option>All Levels</option>
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </label>
                <label className="form-control">
                  <span className="mb-2 text-sm font-medium">Short description</span>
                  <textarea
                    name="shortDescription"
                    defaultValue={course.shortDescription}
                    onChange={handleCourseFieldChange}
                    className="textarea textarea-bordered rounded-2xl min-h-24"
                  />
                </label>
                <label className="form-control">
                  <span className="mb-2 text-sm font-medium">Description</span>
                  <textarea
                    name="description"
                    defaultValue={course.description}
                    onChange={handleCourseFieldChange}
                    className="textarea textarea-bordered rounded-2xl min-h-28"
                  />
                </label>
                <label className="form-control">
                  <span className="mb-2 text-sm font-medium">Tags</span>
                  <input
                    name="tags"
                    defaultValue={course.tags.join(", ")}
                    onChange={handleCourseFieldChange}
                    className="input input-bordered rounded-2xl"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-base-content/10 bg-base-200/40 p-4">
                  <input
                    type="checkbox"
                    name="persistentRoomEnabled"
                    defaultChecked={course.persistentRoomEnabled}
                    onChange={handleCourseFieldChange}
                    className="checkbox checkbox-primary"
                  />
                  <span className="text-sm">Enable persistent course room</span>
                </label>
                <label className="form-control">
                  <span className="mb-2 text-sm font-medium">Enrollment mode</span>
                  <select
                    name="enrollmentMode"
                    defaultValue={course.enrollmentMode}
                    onChange={handleCourseFieldChange}
                    className="select select-bordered rounded-2xl"
                  >
                    <option value="open">Open join</option>
                    <option value="approval">Teacher approval</option>
                    <option value="invite">Invite only</option>
                  </select>
                </label>
                <label className="form-control">
                  <span className="mb-2 text-sm font-medium">Invite code</span>
                  <input
                    name="inviteCode"
                    defaultValue={course.inviteCode || ""}
                    onChange={handleCourseFieldChange}
                    className="input input-bordered rounded-2xl uppercase"
                  />
                </label>
                <button className="btn btn-primary rounded-2xl" onClick={handleSaveCourse} disabled={updateCourseMutation.isPending}>
                  Save Course Settings
                </button>
              </div>
            </section>

            <section className="rounded-[2rem] border border-base-content/10 bg-base-100/90 p-6 shadow-sm">
              <h2 className="text-xl font-bold">Enrollment approvals</h2>
              <div className="mt-5 space-y-4">
                {(course.enrollments || []).length > 0 ? (
                  course.enrollments.map((entry) => (
                    <div key={entry._id} className="rounded-2xl border border-base-content/10 bg-base-200/30 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{entry.student?.name || "Student"}</p>
                          <p className="text-xs text-base-content/60">{entry.student?.email}</p>
                        </div>
                        <span className="badge badge-outline">{entry.status}</span>
                      </div>
                      {entry.status === "pending" && (
                        <div className="mt-4 flex gap-3">
                          <button
                            className="btn btn-primary btn-sm rounded-xl"
                            onClick={() => approveEnrollmentMutation.mutate({ courseId: course._id, enrollmentId: entry._id })}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-outline btn-sm rounded-xl"
                            onClick={() => rejectEnrollmentMutation.mutate({ courseId: course._id, enrollmentId: entry._id })}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-base-content/60">No enrollment requests yet.</p>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-base-content/10 bg-base-100/90 p-6 shadow-sm">
              <h2 className="text-xl font-bold">Schedule a live class</h2>
              <form onSubmit={handleCreateClass} className="mt-5 space-y-4">
                <input
                  className="input input-bordered rounded-2xl w-full"
                  placeholder="Class title"
                  value={classForm.title}
                  onChange={(event) => setClassForm((current) => ({ ...current, title: event.target.value }))}
                  required
                />
                <textarea
                  className="textarea textarea-bordered rounded-2xl w-full min-h-24"
                  placeholder="Class description"
                  value={classForm.description}
                  onChange={(event) => setClassForm((current) => ({ ...current, description: event.target.value }))}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    type="datetime-local"
                    className="input input-bordered rounded-2xl w-full"
                    value={classForm.scheduledStart}
                    onChange={(event) => setClassForm((current) => ({ ...current, scheduledStart: event.target.value }))}
                    required
                  />
                  <input
                    type="datetime-local"
                    className="input input-bordered rounded-2xl w-full"
                    value={classForm.scheduledEnd}
                    onChange={(event) => setClassForm((current) => ({ ...current, scheduledEnd: event.target.value }))}
                    required
                  />
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-base-content/10 bg-base-200/40 p-4">
                  <input
                    type="checkbox"
                    checked={classForm.usePersistentRoom}
                    onChange={(event) => setClassForm((current) => ({ ...current, usePersistentRoom: event.target.checked }))}
                    className="checkbox checkbox-primary"
                  />
                  <span className="text-sm">Reuse persistent room for this class</span>
                </label>
                <button type="submit" className="btn btn-primary rounded-2xl" disabled={createClassSessionMutation.isPending}>
                  Schedule Class
                </button>
              </form>
            </section>

            <section className="rounded-[2rem] border border-base-content/10 bg-base-100/90 p-6 shadow-sm">
              <h2 className="text-xl font-bold">Assignments</h2>
              <form onSubmit={handleCreateAssignment} className="mt-5 space-y-4">
                <input
                  className="input input-bordered rounded-2xl w-full"
                  placeholder="Assignment title"
                  value={assignmentForm.title}
                  onChange={(event) => setAssignmentForm((current) => ({ ...current, title: event.target.value }))}
                  required
                />
                <textarea
                  className="textarea textarea-bordered rounded-2xl w-full min-h-24"
                  placeholder="Instructions"
                  value={assignmentForm.description}
                  onChange={(event) => setAssignmentForm((current) => ({ ...current, description: event.target.value }))}
                />
                <input
                  type="datetime-local"
                  className="input input-bordered rounded-2xl w-full"
                  value={assignmentForm.dueDate}
                  onChange={(event) => setAssignmentForm((current) => ({ ...current, dueDate: event.target.value }))}
                  required
                />
                <button type="submit" className="btn btn-primary rounded-2xl" disabled={createAssignmentMutation.isPending}>
                  Create Assignment
                </button>
              </form>

              <div className="mt-6 space-y-4">
                {(course.assignments || []).map((assignment) => (
                  <div key={assignment._id} className="rounded-2xl border border-base-content/10 bg-base-200/30 p-4">
                    <h3 className="font-semibold">{assignment.title}</h3>
                    <p className="mt-1 text-xs text-base-content/60">Due {format(new Date(assignment.dueDate), "MMM d, yyyy p")}</p>
                    <p className="mt-2 text-sm text-base-content/70">{assignment.description}</p>
                    <p className="mt-3 text-xs text-base-content/60">{assignment.submissionCount} submissions</p>
                    <div className="mt-4 space-y-3">
                      {(assignment.submissions || []).map((submission) => (
                        <div key={submission._id} className="rounded-xl border border-base-content/10 bg-base-100/60 p-3">
                          <p className="font-medium">{submission.student?.name || "Student"}</p>
                          <p className="mt-1 text-sm text-base-content/70 whitespace-pre-wrap">{submission.content}</p>
                          <textarea
                            className="textarea textarea-bordered rounded-xl w-full mt-3 min-h-20"
                            placeholder="Feedback"
                            value={feedbackDrafts[submission._id] ?? submission.feedback ?? ""}
                            onChange={(event) =>
                              setFeedbackDrafts((current) => ({ ...current, [submission._id]: event.target.value }))
                            }
                          />
                          <button
                            className="btn btn-primary btn-sm rounded-xl mt-3"
                            onClick={() =>
                              reviewAssignmentMutation.mutate({
                                courseId: course._id,
                                assignmentId: assignment._id,
                                submissionId: submission._id,
                                feedback: feedbackDrafts[submission._id] ?? submission.feedback ?? "",
                              })
                            }
                          >
                            Mark Reviewed
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {!canManage && course.myEnrollment?.status === "approved" && (
          <section className="mt-8 rounded-[2rem] border border-base-content/10 bg-base-100/85 p-6">
            <h2 className="text-xl font-bold">Assignments</h2>
            <div className="mt-5 space-y-4">
              {(course.assignments || []).length > 0 ? (
                course.assignments.map((assignment) => (
                  <div key={assignment._id} className="rounded-2xl border border-base-content/10 bg-base-200/30 p-4">
                    <h3 className="font-semibold">{assignment.title}</h3>
                    <p className="mt-1 text-xs text-base-content/60">Due {format(new Date(assignment.dueDate), "MMM d, yyyy p")}</p>
                    <p className="mt-2 text-sm text-base-content/70">{assignment.description}</p>
                    {assignment.mySubmission ? (
                      <div className="mt-3 rounded-xl border border-base-content/10 bg-base-100/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-base-content/50">Your submission</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-base-content/80">{assignment.mySubmission.content}</p>
                        {assignment.mySubmission.feedback && (
                          <p className="mt-3 text-sm text-primary">Feedback: {assignment.mySubmission.feedback}</p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4">
                        <textarea
                          className="textarea textarea-bordered rounded-xl w-full min-h-24"
                          placeholder="Write your submission here"
                          value={submissionDrafts[assignment._id] || ""}
                          onChange={(event) =>
                            setSubmissionDrafts((current) => ({ ...current, [assignment._id]: event.target.value }))
                          }
                        />
                        <button
                          className="btn btn-primary btn-sm rounded-xl mt-3"
                          onClick={() =>
                            submitAssignmentMutation.mutate({
                              courseId: course._id,
                              assignmentId: assignment._id,
                              content: submissionDrafts[assignment._id] || "",
                            })
                          }
                        >
                          Submit Assignment
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-base-content/60">No assignments yet.</p>
              )}
            </div>
          </section>
        )}
      </PageContainer>

      <Footer />
    </div>
  );
}

export default CourseDetailPage;
