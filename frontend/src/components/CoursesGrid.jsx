import { ArrowRight, BookOpenText, Sparkles, Users } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router";

function CoursesGrid({ title, subtitle, courses = [], totalCourses = 0, onViewAll, emptyLabel, emptyHint }) {
  const navigate = useNavigate();

  return (
    <div className="bg-base-100/50 backdrop-blur-xl border border-base-content/10 rounded-3xl p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-base-content/60">{subtitle}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onViewAll}>
          View All
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {courses.length > 0 ? (
          courses.map((course) => (
            <div
              key={course._id}
              className="group border border-base-content/10 bg-base-100/30 hover:bg-base-200/50 transition-colors p-5 rounded-2xl flex flex-col justify-between min-h-56"
            >
              <div>
                <div className="p-2 w-10 h-10 rounded-xl bg-base-100 shadow-sm flex items-center justify-center mb-3 text-primary">
                  <BookOpenText className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg leading-tight line-clamp-2">{course.title}</h3>
                <p className="text-sm text-base-content/60 mt-1">
                  {course.code} • {course.teacher?.name || "Teacher"}
                </p>
                <p className="mt-3 text-sm text-base-content/70 line-clamp-3">{course.shortDescription}</p>
              </div>

              <div className="flex justify-between items-end mt-4 gap-4">
                <div className="space-y-2 text-xs text-base-content/55 font-medium">
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
                <button className="btn btn-sm btn-outline rounded-xl" onClick={() => navigate(`/courses/${course._id}`)}>
                  Open
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed border-base-content/15 bg-base-100/40 p-8 text-center">
            <p className="font-semibold text-base-content/80">{emptyLabel}</p>
            <p className="mt-2 text-sm text-base-content/55">{emptyHint}</p>
          </div>
        )}

        <button
          type="button"
          onClick={onViewAll}
          className="border border-dashed border-base-content/20 hover:border-primary/50 bg-base-100/10 hover:bg-primary/5 transition-all p-5 rounded-2xl flex flex-col items-center justify-center min-h-56 cursor-pointer text-base-content/50 hover:text-primary text-left"
        >
          <div className="w-12 h-12 rounded-full bg-base-200 flex items-center justify-center mb-3">
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
