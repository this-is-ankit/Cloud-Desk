import { useNavigate, useParams } from "react-router";
import { Loader2 } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useTeacherById } from "../hooks/useUsers";

function TeacherDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const teacherQuery = useTeacherById(id);
  const teacher = teacherQuery.data?.teacher;
  const courses = teacherQuery.data?.courses || [];

  if (teacherQuery.isLoading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <Navbar />
      <div className="mx-auto w-full max-w-[1180px] flex-grow px-4 py-10 md:px-6">
        {!teacher ? (
          <div className="rounded-[2rem] border border-base-content/10 bg-base-100 p-8">
            <h1 className="text-3xl font-black">Teacher not found</h1>
          </div>
        ) : (
          <>
            <div className="rounded-[2rem] border border-base-content/10 bg-base-100 p-7">
              <div className="flex flex-col gap-5 md:flex-row md:items-center">
                <img src={teacher.profileImage} alt={teacher.name} className="size-24 rounded-[2rem] object-cover" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Teacher profile</p>
                  <h1 className="mt-2 text-4xl font-black">{teacher.name}</h1>
                  <p className="mt-2 text-base-content/70">{teacher.headline || "Live educator"}</p>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-base-content/70">{teacher.bio || "This teacher uses Cloud Desk to run live teaching courses."}</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {(teacher.subjects || []).map((subject) => <span key={subject} className="badge badge-outline">{subject}</span>)}
                {(teacher.languagesSpoken || []).map((language) => <span key={language} className="badge badge-ghost">{language}</span>)}
              </div>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {courses.map((course) => (
                <article key={course._id} className="rounded-[2rem] border border-base-content/10 bg-base-100 p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{course.code}</p>
                  <h2 className="mt-2 text-2xl font-black">{course.title}</h2>
                  <p className="mt-3 text-sm text-base-content/70">{course.shortDescription}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="badge badge-ghost">{course.category}</span>
                    <span className="badge badge-outline">{course.enrollmentMode}</span>
                  </div>
                  <button className="btn btn-primary btn-sm rounded-xl mt-5" onClick={() => navigate(`/courses/${course._id}`)}>
                    Open course
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default TeacherDetailPage;
