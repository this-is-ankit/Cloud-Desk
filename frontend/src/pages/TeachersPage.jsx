import { useDeferredValue, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, Search } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useTeachers } from "../hooks/useUsers";
import PageContainer from "../components/PageContainer";

function TeachersPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ q: "", subject: "", language: "" });
  const deferredQuery = useDeferredValue(filters.q);
  const teachersQuery = useTeachers({ ...filters, q: deferredQuery });
  const teachers = teachersQuery.data?.teachers || [];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <Navbar />
      <PageContainer className="flex-grow py-10">
        <div className="rounded-[2rem] border border-base-content/10 bg-gradient-to-br from-base-100 via-base-100 to-secondary/5 p-7 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Teacher Discovery
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Find teachers running live cohorts.
          </h1>
          <p className="mt-4 max-w-2xl text-base-content/65">
            Search by teacher name, subject, and spoken language to discover
            live educators, compare profiles, and join better-fit courses.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <label className="form-control md:col-span-1">
              <span className="mb-2 text-sm font-medium">Search</span>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-base-content/40" />
                <input
                  name="q"
                  value={filters.q}
                  onChange={handleChange}
                  className="input input-bordered rounded-2xl w-full pl-11"
                  placeholder="Teacher or expertise"
                />
              </div>
            </label>
            <label className="form-control">
              <span className="mb-2 text-sm font-medium">Subject</span>
              <input
                name="subject"
                value={filters.subject}
                onChange={handleChange}
                className="input input-bordered rounded-2xl"
                placeholder="DSA"
              />
            </label>
            <label className="form-control">
              <span className="mb-2 text-sm font-medium">Language</span>
              <input
                name="language"
                value={filters.language}
                onChange={handleChange}
                className="input input-bordered rounded-2xl"
                placeholder="English"
              />
            </label>
          </div>
        </div>

        <div className="mt-8">
          {teachersQuery.isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {teachers.map((teacher) => (
                <article
                  key={teacher._id}
                  className="rounded-[2rem] border border-base-content/10 bg-base-100 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={teacher.profileImage}
                      alt={teacher.name}
                      className="size-14 rounded-2xl object-cover"
                    />
                    <div>
                      <h2 className="text-xl font-black">{teacher.name}</h2>
                      <p className="text-sm text-base-content/60">
                        {teacher.headline || "Live teacher"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-base-content/70">
                    {teacher.bio ||
                      "This teacher is available for live classes on Cloud Desk."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(teacher.subjects || []).slice(0, 4).map((subject) => (
                      <span key={subject} className="badge badge-outline">
                        {subject}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 text-sm text-base-content/65">
                    <p>
                      Published courses:{" "}
                      {teacher.stats?.publishedCourseCount || 0}
                    </p>
                    <p>
                      Upcoming classes: {teacher.stats?.upcomingClassCount || 0}
                    </p>
                    <p>
                      Availability:{" "}
                      {teacher.availabilityNote || "Shared on profile"}
                    </p>
                  </div>
                  <button
                    className="btn btn-primary btn-sm rounded-xl mt-5"
                    onClick={() => navigate(`/teachers/${teacher._id}`)}
                  >
                    View teacher
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
      <Footer />
    </div>
  );
}

export default TeachersPage;
