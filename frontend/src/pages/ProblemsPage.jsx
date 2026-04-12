import { Link } from "react-router";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageContainer from "../components/PageContainer";

import { PROBLEMS } from "../data/problems";
import { ChevronRightIcon, Code2Icon } from "../components/icons/ModernIcons";
import { getDifficultyBadgeClass } from "../lib/utils";

function ProblemsPage() {
  const problems = Object.values(PROBLEMS);

  const easyProblemsCount = problems.filter(
    (p) => p.difficulty === "Easy",
  ).length;
  const mediumProblemsCount = problems.filter(
    (p) => p.difficulty === "Medium",
  ).length;
  const hardProblemsCount = problems.filter(
    (p) => p.difficulty === "Hard",
  ).length;

  return (
    <div className="min-h-screen bg-base-100 flex flex-col font-jakarta">
      <Navbar />

      <PageContainer className="flex-grow">
        {/* HEADER */}
        <div className="mb-10 pt-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight text-base-content">
            Practice Problems
          </h1>
          <p className="text-lg text-base-content/60 font-medium max-w-2xl">
            Sharpen your coding skills with these curated exercises. Master the
            fundamentals before joining a live cohort.
          </p>
        </div>

        {/* STATS OVERVIEW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-base-100 border border-base-200 p-5 rounded-2xl shadow-sm flex flex-col">
            <span className="text-sm font-semibold text-base-content/60">
              Total Problems
            </span>
            <span className="text-3xl font-bold mt-1 text-base-content">
              {problems.length}
            </span>
          </div>
          <div className="bg-base-100 border border-base-200 p-5 rounded-2xl shadow-sm flex flex-col">
            <span className="text-sm font-semibold text-success">Easy</span>
            <span className="text-3xl font-bold mt-1 text-base-content">
              {easyProblemsCount}
            </span>
          </div>
          <div className="bg-base-100 border border-base-200 p-5 rounded-2xl shadow-sm flex flex-col">
            <span className="text-sm font-semibold text-warning">Medium</span>
            <span className="text-3xl font-bold mt-1 text-base-content">
              {mediumProblemsCount}
            </span>
          </div>
          <div className="bg-base-100 border border-base-200 p-5 rounded-2xl shadow-sm flex flex-col">
            <span className="text-sm font-semibold text-error">Hard</span>
            <span className="text-3xl font-bold mt-1 text-base-content">
              {hardProblemsCount}
            </span>
          </div>
        </div>

        {/* PROBLEMS GRID / LIST */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {problems.map((problem) => (
            <Link
              key={problem.id}
              to={`/problem/${problem.id}`}
              className="group flex flex-col justify-between bg-base-100 border border-base-200 hover:border-primary/40 rounded-2xl p-6 transition-all shadow-sm hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-base-200 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                    <Code2Icon className="size-6" />
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border ${getDifficultyBadgeClass(problem.difficulty)} border-current bg-opacity-10`}
                  >
                    {problem.difficulty}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-base-content mb-1 group-hover:text-primary transition-colors">
                  {problem.title}
                </h2>
                <p className="text-sm font-semibold text-base-content/50 uppercase tracking-widest mb-3">
                  {problem.category}
                </p>
                <p className="text-base-content/70 text-sm line-clamp-2 leading-relaxed font-medium">
                  {problem.description.text}
                </p>
              </div>

              <div className="flex items-center gap-2 text-primary font-semibold mt-6 group-hover:translate-x-1 transition-transform">
                <span>Solve Challenge</span>
                <ChevronRightIcon className="size-5" />
              </div>
            </Link>
          ))}
        </div>
      </PageContainer>

      <Footer />
    </div>
  );
}
export default ProblemsPage;
