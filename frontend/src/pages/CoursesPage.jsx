import { useDeferredValue, useEffect, useState } from "react";
import { useNavigate } from "react-router";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CreateCourseModal from "../components/CreateCourseModal";
import { useCourses, useCreateCourse, useJoinCourseWithInvite, useRequestEnrollment } from "../hooks/useCourses";
import { useAppUser } from "../hooks/useAppUser";
import { getSessionLanguageLabel } from "../lib/sessionLanguage";
import PageContainer from "../components/PageContainer";
import {
  ArrowRightIcon,
  BookOpenIcon,
  FilterIcon,
  LayoutDashboardIcon,
  Loader2Icon,
  PlusCircleIcon,
  SearchIcon,
  SparklesIcon,
  UserCheckIcon,
  UserPlusIcon,
} from "../components/icons/ModernIcons";

const INITIAL_FILTERS = {
  q: "",
  category: "",
  level: "",
  language: "",
  enrollmentMode: "",
  sort: "popular",
  scope: "",
};

function CoursesPage() {
  const navigate = useNavigate();
  const { isTeacher } = useAppUser();
  const [filters, setFilters] = useState({
    ...INITIAL_FILTERS,
    scope: isTeacher ? "mine" : "discover",
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const deferredSearch = useDeferredValue(filters.q);

  const courseQuery = useCourses({
    ...filters,
    q: deferredSearch,
    limit: 60,
  });
  const createCourseMutation = useCreateCourse();
  const requestEnrollmentMutation = useRequestEnrollment();
  const joinCourseWithInviteMutation = useJoinCourseWithInvite();
  const [inviteCodes, setInviteCodes] = useState({});

  const courses = courseQuery.data?.courses || [];
  const totalCourses = courseQuery.data?.meta?.total || 0;

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      scope: isTeacher ? (current.scope === "enrolled" ? "mine" : current.scope || "mine") : (current.scope === "mine" ? "discover" : current.scope || "discover"),
    }));
  }, [isTeacher]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const handleScopeChange = (scope) => {
    setFilters((current) => ({ ...current, scope }));
  };

  const handleCreateCourse = (payload, resetForm) => {
    createCourseMutation.mutate(payload, {
      onSuccess: (data) => {
        resetForm();
        setIsCreateModalOpen(false);
        navigate(`/courses/${data.course._id}`);
      },
    });
  };

  const handleRequestEnrollment = (courseId) => {
    requestEnrollmentMutation.mutate(courseId);
  };

  const handleJoinWithInvite = (courseId) => {
    joinCourseWithInviteMutation.mutate({
      courseId,
      inviteCode: inviteCodes[courseId] || "",
    });
  };

  return (
    <>
      <div className="min-h-screen bg-base-200">
        <Navbar />

        <PageContainer className="py-10">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <header className="flex flex-col justify-center rounded-xl border border-base-content/10 bg-base-100 p-8 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                {isTeacher ? "Teacher Course Hub" : "Live Course Catalog"}
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                {isTeacher ? "Create, publish, and manage live teaching courses." : "Discover teacher-led live courses."}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed opacity-60">
                {isTeacher
                  ? "Draft courses, publish them when ready, approve enrollments, schedule classes, launch rooms, and run assignments from the course workspace."
                  : "Browse published courses, join open cohorts instantly, request approval-based cohorts, or use invite codes for private teacher communities."}
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {isTeacher && (
                  <button className="btn btn-primary btn-sm rounded-none px-6" onClick={() => setIsCreateModalOpen(true)}>
                    <PlusCircleIcon className="size-4" />
                    Create
                  </button>
                )}
                <button className="btn btn-outline btn-sm rounded-none px-6 gap-2" onClick={() => navigate("/dashboard")}>
                  <LayoutDashboardIcon className="size-4" />
                  Dashboard
                </button>
              </div>
            </header>

            <div className="flex flex-col gap-3">
              <div className="group flex flex-1 items-center justify-between rounded-xl border border-base-content/10 bg-base-100 p-5 transition-all hover:border-primary/30">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Matching Courses</p>
                  <p className="mt-1 text-3xl font-black leading-none">{totalCourses}</p>
                </div>
                <div className="rounded-lg bg-base-200 p-3 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <SparklesIcon className="size-6" />
                </div>
              </div>

              <div className="group flex flex-1 items-center justify-between rounded-xl border border-base-content/10 bg-base-100 p-5 transition-all hover:border-success/30">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                    {isTeacher ? "Published" : "Approved"}
                  </p>
                  <p className="mt-1 text-3xl font-black leading-none">
                    {
                      courses.filter((course) =>
                        isTeacher ? course.status === "published" : course.viewerEnrollmentStatus === "approved",
                      ).length
                    }
                  </p>
                </div>
                <div className="rounded-lg bg-base-200 p-3 transition-colors group-hover:bg-success/10 group-hover:text-success">
                  <BookOpenIcon className="size-6" />
                </div>
              </div>

              <div className="group flex flex-1 items-center justify-between rounded-xl border border-base-content/10 bg-base-100 p-5 transition-all hover:border-warning/30">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                    {isTeacher ? "Pending approvals" : "Pending requests"}
                  </p>
                  <p className="mt-1 text-3xl font-black leading-none">
                    {courses.reduce(
                      (sum, course) =>
                        sum + (isTeacher ? course.pendingEnrollmentCount || 0 : course.viewerEnrollmentStatus === "pending" ? 1 : 0),
                      0,
                    )}
                  </p>
                </div>
                <div className="rounded-lg bg-base-200 p-3 transition-colors group-hover:bg-warning/10 group-hover:text-warning">
                  <UserCheckIcon className="size-6" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-base-content/10 bg-base-100 p-5 shadow-sm md:p-6">
            <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-base-content/10 pb-5">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-base-content/50">
                <FilterIcon className="size-4" />
                View
              </span>
              {isTeacher ? (
                <>
                  <button
                    className={`btn btn-sm gap-2 rounded-none px-5 ${filters.scope === "mine" ? "btn-primary" : "btn-outline"}`}
                    onClick={() => handleScopeChange("mine")}
                  >
                    <BookOpenIcon className="size-4" />
                    Mine
                  </button>
                  <button
                    className={`btn btn-sm gap-2 rounded-none px-5 ${filters.scope === "discover" ? "btn-primary" : "btn-outline"}`}
                    onClick={() => handleScopeChange("discover")}
                  >
                    <SparklesIcon className="size-4" />
                    Discover
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={`btn btn-sm gap-2 rounded-none px-5 ${filters.scope === "discover" ? "btn-primary" : "btn-outline"}`}
                    onClick={() => handleScopeChange("discover")}
                  >
                    <SparklesIcon className="size-4" />
                    Discover
                  </button>
                  <button
                    className={`btn btn-sm gap-2 rounded-none px-5 ${filters.scope === "enrolled" ? "btn-primary" : "btn-outline"}`}
                    onClick={() => handleScopeChange("enrolled")}
                  >
                    <UserCheckIcon className="size-4" />
                    Requests
                  </button>
                </>
              )}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.5fr_repeat(5,0.7fr)]">
              <label className="form-control xl:col-span-2">
                <span className="mb-2 text-[10px] font-bold uppercase tracking-widest opacity-60">Search</span>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 opacity-30" />
                  <input
                    name="q"
                    value={filters.q}
                    onChange={handleFilterChange}
                    className="input input-bordered h-11 w-full rounded-none pl-11 text-sm focus:border-primary"
                    placeholder="Search by title, code, subject, teacher, or tag"
                  />
                </div>
              </label>

              <label className="form-control">
                <span className="mb-2 text-[10px] font-bold uppercase tracking-widest opacity-60">Category</span>
                <input
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                  className="input input-bordered h-11 rounded-none text-sm focus:border-primary"
                  placeholder="Computer Science"
                />
              </label>

              <label className="form-control">
                <span className="mb-2 text-[10px] font-bold uppercase tracking-widest opacity-60">Level</span>
                <select
                  name="level"
                  value={filters.level}
                  onChange={handleFilterChange}
                  className="select select-bordered h-11 rounded-none text-sm focus:border-primary"
                >
                  <option value="">All</option>
                  <option value="All Levels">All Levels</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </label>

              <label className="form-control">
                <span className="mb-2 text-[10px] font-bold uppercase tracking-widest opacity-60">Language</span>
                <input
                  name="language"
                  value={filters.language}
                  onChange={handleFilterChange}
                  className="input input-bordered h-11 rounded-none text-sm focus:border-primary"
                  placeholder="Python"
                />
              </label>

              <label className="form-control">
                <span className="mb-2 text-[10px] font-bold uppercase tracking-widest opacity-60">Access</span>
                <select
                  name="enrollmentMode"
                  value={filters.enrollmentMode}
                  onChange={handleFilterChange}
                  className="select select-bordered h-11 rounded-none text-sm focus:border-primary"
                >
                  <option value="">All</option>
                  <option value="open">Open join</option>
                  <option value="approval">Teacher approval</option>
                  <option value="invite">Invite only</option>
                </select>
              </label>

              <label className="form-control">
                <span className="mb-2 text-[10px] font-bold uppercase tracking-widest opacity-60">Sort</span>
                <select
                  name="sort"
                  value={filters.sort}
                  onChange={handleFilterChange}
                  className="select select-bordered h-11 rounded-none text-sm focus:border-primary"
                >
                  <option value="popular">Most popular</option>
                  <option value="relevance">Best match</option>
                  <option value="upcoming">Nearest class</option>
                  <option value="newest">Newest</option>
                  <option value="title">Title A-Z</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-8">
            {courseQuery.isLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2Icon className="size-10 animate-spin text-primary" />
              </div>
            ) : courses.length > 0 ? (
              <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
                {courses.map((course) => (
                  <article
                    key={course._id}
                    className="flex flex-col rounded-xl border border-base-content/10 bg-base-100 p-6 transition-all hover:border-primary/20 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{course.code}</p>
                        <h2 className="mt-2 text-xl font-black tracking-tight text-base-content">{course.title}</h2>
                      </div>
                      <span className="badge badge-sm rounded-none border-base-content/20 bg-transparent font-bold uppercase text-base-content/60">
                        {course.status}
                      </span>
                    </div>

                    <p className="mt-4 flex-1 text-sm leading-relaxed opacity-60">{course.shortDescription}</p>

                    <div className="mt-6 flex flex-wrap gap-1.5">
                      <span className="rounded-none border border-base-content/10 bg-base-200/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider opacity-70">
                        {course.category}
                      </span>
                      <span className="rounded-none border border-base-content/10 bg-base-200/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider opacity-70">
                        {getSessionLanguageLabel(course.language)}
                      </span>
                      {course.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-none border border-base-content/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider opacity-50"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-6 space-y-2 border-y border-base-content/5 py-4 text-[11px] font-medium uppercase tracking-wider opacity-60">
                      <div className="flex justify-between">
                        <span>Teacher</span>
                        <span className="text-base-content">{course.teacher?.name || "Unknown"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Access</span>
                        <span className="text-base-content">{course.enrollmentMode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Students</span>
                        <span className="text-base-content">{course.approvedStudentCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Enrollment Status</span>
                        <span className="text-primary">
                          {course.viewerEnrollmentStatus || (isTeacher && course.isTeacherOwner ? "teacher" : "not requested")}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 flex gap-2">
                      <button
                        className="btn btn-outline btn-sm flex-1 gap-2 rounded-none border-base-content/20 uppercase tracking-widest"
                        onClick={() => navigate(`/courses/${course._id}`)}
                      >
                        Open
                        <ArrowRightIcon className="size-4" />
                      </button>
                      {!isTeacher && !course.isTeacherOwner && (
                        course.enrollmentMode === "invite" && !course.viewerEnrollmentStatus ? (
                          <div className="flex flex-1 flex-col gap-2">
                            <input
                              value={inviteCodes[course._id] || ""}
                              onChange={(event) => setInviteCodes((current) => ({ ...current, [course._id]: event.target.value }))}
                              className="input input-bordered h-8 w-full rounded-none text-xs uppercase"
                              placeholder="Invite Code"
                            />
                            <button
                              className="btn btn-primary btn-sm gap-2 rounded-none uppercase tracking-widest"
                              onClick={() => handleJoinWithInvite(course._id)}
                              disabled={joinCourseWithInviteMutation.isPending}
                            >
                              <UserPlusIcon className="size-4" />
                              Join
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm flex-1 gap-2 rounded-none uppercase tracking-widest"
                            onClick={() => handleRequestEnrollment(course._id)}
                            disabled={Boolean(course.viewerEnrollmentStatus) || requestEnrollmentMutation.isPending}
                          >
                            {course.viewerEnrollmentStatus ? (
                              <UserCheckIcon className="size-4" />
                            ) : course.enrollmentMode === "open" ? (
                              <UserPlusIcon className="size-4" />
                            ) : (
                              <UserCheckIcon className="size-4" />
                            )}
                            {course.viewerEnrollmentStatus
                              ? course.viewerEnrollmentStatus
                              : course.enrollmentMode === "open"
                                ? "Join"
                                : "Request"}
                          </button>
                        )
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-base-content/15 bg-base-100/60 px-6 py-20 text-center">
                <h2 className="text-2xl font-black text-base-content">No courses found</h2>
                <p className="mt-3 text-sm opacity-60">
                  {isTeacher ? "Create a draft course or switch filters." : "Try a broader search or request enrollment."}
                </p>
              </div>
            )}
          </div>
        </PageContainer>

        <Footer />
      </div>

      {isTeacher && (
        <CreateCourseModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateCourse}
          isSubmitting={createCourseMutation.isPending}
        />
      )}
    </>
  );
}

export default CoursesPage;
