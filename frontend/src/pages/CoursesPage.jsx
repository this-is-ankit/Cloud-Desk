import { useDeferredValue, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router";
import { BookOpenText, Loader2, PlusCircle, Search, Sparkles, UserCheck } from "lucide-react";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CreateCourseModal from "../components/CreateCourseModal";
import { useCourses, useCreateCourse, useRequestEnrollment } from "../hooks/useCourses";

const INITIAL_FILTERS = {
  q: "",
  category: "",
  level: "",
  language: "",
  sort: "popular",
  scope: "",
};

function CoursesPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const isTeacher = user?.publicMetadata?.role === "teacher";
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

  const courses = courseQuery.data?.courses || [];
  const totalCourses = courseQuery.data?.meta?.total || 0;

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

  return (
    <>
      <div className="min-h-screen bg-base-200">
        <Navbar />

        <div className="mx-auto w-full max-w-[1320px] px-4 py-10 md:px-6">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] border border-base-content/10 bg-gradient-to-br from-base-100 via-base-100 to-primary/5 p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                {isTeacher ? "Teacher Course Hub" : "Live Course Catalog"}
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-base-content md:text-5xl">
                {isTeacher ? "Create, publish, and manage live teaching courses." : "Discover teacher-led live courses."}
              </h1>
              <p className="mt-4 max-w-2xl text-base text-base-content/65">
                {isTeacher
                  ? "Draft courses, publish them when ready, approve enrollments, schedule classes, launch rooms, and run assignments from the course workspace."
                  : "Browse published courses, request enrollment, and join live classes only after teacher approval."}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {isTeacher && (
                  <button className="btn btn-primary rounded-2xl" onClick={() => setIsCreateModalOpen(true)}>
                    <PlusCircle className="size-4" />
                    Create Draft Course
                  </button>
                )}
                <button className="btn btn-outline rounded-2xl" onClick={() => navigate("/dashboard")}>
                  Back to Dashboard
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-[1.75rem] border border-base-content/10 bg-base-100/80 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content/60">Matching Courses</p>
                    <p className="mt-1 text-3xl font-black">{totalCourses}</p>
                  </div>
                  <Sparkles className="size-6 text-primary" />
                </div>
              </div>
              <div className="rounded-[1.75rem] border border-base-content/10 bg-base-100/80 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content/60">{isTeacher ? "Published" : "Approved"}</p>
                    <p className="mt-1 text-3xl font-black">
                      {courses.filter((course) => (isTeacher ? course.status === "published" : course.viewerEnrollmentStatus === "approved")).length}
                    </p>
                  </div>
                  <BookOpenText className="size-6 text-success" />
                </div>
              </div>
              <div className="rounded-[1.75rem] border border-base-content/10 bg-base-100/80 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-base-content/60">{isTeacher ? "Pending approvals" : "Pending requests"}</p>
                    <p className="mt-1 text-3xl font-black">
                      {courses.reduce(
                        (sum, course) => sum + (isTeacher ? course.pendingEnrollmentCount || 0 : course.viewerEnrollmentStatus === "pending" ? 1 : 0),
                        0,
                      )}
                    </p>
                  </div>
                  <UserCheck className="size-6 text-warning" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-[2rem] border border-base-content/10 bg-base-100/80 p-5 md:p-6">
            <div className="grid gap-4 xl:grid-cols-[1.5fr_repeat(4,0.7fr)]">
              <label className="form-control xl:col-span-2">
                <span className="mb-2 text-sm font-medium text-base-content/75">Search</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-base-content/40" />
                  <input
                    name="q"
                    value={filters.q}
                    onChange={handleFilterChange}
                    className="input input-bordered h-12 w-full rounded-2xl pl-11"
                    placeholder="Search by title, code, subject, teacher, or tag"
                  />
                </div>
              </label>

              <label className="form-control">
                <span className="mb-2 text-sm font-medium text-base-content/75">Category</span>
                <input
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                  className="input input-bordered h-12 rounded-2xl"
                  placeholder="Computer Science"
                />
              </label>

              <label className="form-control">
                <span className="mb-2 text-sm font-medium text-base-content/75">Level</span>
                <select
                  name="level"
                  value={filters.level}
                  onChange={handleFilterChange}
                  className="select select-bordered h-12 rounded-2xl"
                >
                  <option value="">All</option>
                  <option value="All Levels">All Levels</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </label>

              <label className="form-control">
                <span className="mb-2 text-sm font-medium text-base-content/75">Language</span>
                <input
                  name="language"
                  value={filters.language}
                  onChange={handleFilterChange}
                  className="input input-bordered h-12 rounded-2xl"
                  placeholder="Python"
                />
              </label>

              <label className="form-control">
                <span className="mb-2 text-sm font-medium text-base-content/75">Sort</span>
                <select
                  name="sort"
                  value={filters.sort}
                  onChange={handleFilterChange}
                  className="select select-bordered h-12 rounded-2xl"
                >
                  <option value="popular">Most popular</option>
                  <option value="relevance">Best match</option>
                  <option value="upcoming">Nearest class</option>
                  <option value="newest">Newest</option>
                  <option value="title">Title A-Z</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {isTeacher ? (
                <>
                  <button className={`btn btn-sm rounded-xl ${filters.scope === "mine" ? "btn-primary" : "btn-outline"}`} onClick={() => handleScopeChange("mine")}>
                    My Courses
                  </button>
                  <button className={`btn btn-sm rounded-xl ${filters.scope === "discover" ? "btn-primary" : "btn-outline"}`} onClick={() => handleScopeChange("discover")}>
                    Discover Published
                  </button>
                </>
              ) : (
                <>
                  <button className={`btn btn-sm rounded-xl ${filters.scope === "discover" ? "btn-primary" : "btn-outline"}`} onClick={() => handleScopeChange("discover")}>
                    Discover
                  </button>
                  <button className={`btn btn-sm rounded-xl ${filters.scope === "enrolled" ? "btn-primary" : "btn-outline"}`} onClick={() => handleScopeChange("enrolled")}>
                    My Requested / Enrolled
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-8">
            {courseQuery.isLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="size-10 animate-spin text-primary" />
              </div>
            ) : courses.length > 0 ? (
              <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                {courses.map((course) => (
                  <article key={course._id} className="rounded-[2rem] border border-base-content/10 bg-base-100/85 p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{course.code}</p>
                        <h2 className="mt-2 text-2xl font-black text-base-content">{course.title}</h2>
                      </div>
                      <span className="badge badge-outline">{course.status}</span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-base-content/70">{course.shortDescription}</p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="badge badge-ghost">{course.category}</span>
                      <span className="badge badge-ghost">{course.language}</span>
                      {course.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="badge badge-outline">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-6 space-y-2 text-sm text-base-content/65">
                      <p>Teacher: {course.teacher?.name || "Unknown"}</p>
                      <p>Approved students: {course.approvedStudentCount}</p>
                      <p>
                        Next class:{" "}
                        {course.nextClass ? new Date(course.nextClass.scheduledStart).toLocaleString() : "No class scheduled"}
                      </p>
                      <p>
                        Enrollment status: {course.viewerEnrollmentStatus || (isTeacher && course.isTeacherOwner ? "teacher" : "not requested")}
                      </p>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button className="btn btn-outline rounded-2xl" onClick={() => navigate(`/courses/${course._id}`)}>
                        Open Course
                      </button>
                      {!isTeacher && !course.isTeacherOwner && (
                        <button
                          className="btn btn-primary rounded-2xl"
                          onClick={() => handleRequestEnrollment(course._id)}
                          disabled={Boolean(course.viewerEnrollmentStatus) || requestEnrollmentMutation.isPending}
                        >
                          {course.viewerEnrollmentStatus ? `Request ${course.viewerEnrollmentStatus}` : "Request Enrollment"}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[2rem] border border-dashed border-base-content/15 bg-base-100/60 px-6 py-20 text-center">
                <h2 className="text-2xl font-black text-base-content">No courses in this view yet</h2>
                <p className="mt-3 text-base-content/60">
                  {isTeacher ? "Create a draft course or switch the filter." : "Try a broader search or request enrollment in a published course."}
                </p>
              </div>
            )}
          </div>
        </div>

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
