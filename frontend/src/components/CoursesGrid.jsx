import { ArrowRight, BookOpenText, Sparkles, Users } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router";

function CoursesGrid({ title, subtitle, courses = [], totalCourses = 0, onViewAll, emptyLabel, emptyHint }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-[2rem] border border-base-content/10 bg-base-100 p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="mt-1 text-sm text-base-content/60">{subtitle}</p>
        </div>
        <button className="btn btn-ghost btn-sm rounded-xl" onClick={onViewAll}>
          View All
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {courses.length > 0 ? (
          courses.map((course) => (
            <div
              key={course._id}
              className="group flex min-h-60 flex-col justify-between rounded-[1.6rem] border border-base-content/10 bg-gradient-to-br from-base-100 to-base-200/60 p-5 transition hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
            >
              <div>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <BookOpenText className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg leading-tight line-clamp-2">{course.title}</h3>
                <p className="mt-1 text-sm text-base-content/60">
                  {course.code} • {course.teacher?.name || "Teacher"}
                </p>
                <p className="mt-4 text-sm leading-6 text-base-content/70 line-clamp-3">{course.shortDescription}</p>
              </div>

              <div className="mt-5 flex items-end justify-between gap-4">
                <div className="space-y-2 text-xs font-medium text-base-content/55">
                  <div className="flex items-center">
                    <Users className="mr-1 w-3.5 h-3.5" />
                    {course.approvedStudentCount} approved students
                  </div>
                  <div>
                    {course.nextClass
                      ? `Next class: ${format(new Date(course.nextClass.scheduledStart), "MMM d, p")}`
                      : course.nextAssignment
                        ? `Next assignment: ${format(new Date(course.nextAssignment.dueDate), "MMM d")}`
                        : `Status: ${course.status}`}
                  </div>
                </div>
                <button className="btn btn-sm btn-outline rounded-xl border-base-content/15" onClick={() => navigate(`/courses/${course._id}`)}>
                  Open
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full rounded-[1.6rem] border border-dashed border-base-content/15 bg-base-200/40 p-8 text-center">
            <p className="font-semibold text-base-content/80">{emptyLabel}</p>
            <p className="mt-2 text-sm text-base-content/55">{emptyHint}</p>
          </div>
        )}

        <button
          type="button"
          onClick={onViewAll}
          className="flex min-h-60 cursor-pointer flex-col items-center justify-center rounded-[1.6rem] border border-dashed border-base-content/20 bg-base-200/25 p-5 text-left text-base-content/50 transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-base-100">
            <Sparkles className="size-5" />
          </div>
          <span className="font-medium">Open course workspace</span>
          <span className="mt-2 text-xs">
            {totalCourses > 0 ? `${totalCourses} course${totalCourses === 1 ? "" : "s"} in this view` : "Manage or discover live courses"}
          </span>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">
            Open courses
            <ArrowRight className="size-4" />
          </span>
        </button>
      </div>
    </div>
  );
}

export default CoursesGrid;
