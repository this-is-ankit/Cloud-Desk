import { Link, useNavigate } from "react-router";
import {
  ArrowRightIcon,
  Code2Icon,
  SparklesIcon,
  UsersIcon,
  VideoIcon,
  ZapIcon,
  BookOpenIcon,
  ShieldCheckIcon,
} from "../components/icons/ModernIcons";
import ThemeToggle from "../components/ThemeToggle";
import Footer from "../components/Footer";
import { useRuntimeAuth } from "../hooks/useRuntimeAuth";
import PageContainer from "../components/PageContainer";
import AuthIntentButton from "../components/AuthIntentButton";

function HomePage() {
  const { isLoaded, isSignedIn } = useRuntimeAuth();
  const navigate = useNavigate();

  const authCards = [
    {
      role: "teacher",
      eyebrow: "For educators",
      title: "Start teaching live",
      description:
        "Create courses, schedule classes, run live rooms, and manage enrollments from one workspace.",
      primaryLabel: "Create teacher account",
      secondaryLabel: "Sign in as teacher",
      accentClass: "from-primary/15 to-secondary/10",
    },
    {
      role: "student",
      eyebrow: "For learners",
      title: "Join classes with clarity",
      description:
        "Discover teachers, request access to live cohorts, join classrooms, and track upcoming work.",
      primaryLabel: "Create student account",
      secondaryLabel: "Sign in as student",
      accentClass: "from-secondary/15 to-accent/10",
    },
  ];

  return (
    <div className="min-h-screen bg-base-100">
      <nav className="sticky top-0 z-50 border-b border-base-content/10 bg-base-100/80 backdrop-blur-xl">
        <PageContainer className="py-4">
          <div className="flex items-center justify-between gap-4">
            <Link
              to={"/"}
              className="flex items-center gap-3 transition-transform duration-200 hover:scale-[1.02]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-content shadow-sm">
                <SparklesIcon className="size-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight text-base-content leading-none">
                  Cloud Desk
                </span>
                <span className="text-[11px] font-medium text-base-content/50 uppercase tracking-widest mt-1">
                  Platform
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>

              {isLoaded && isSignedIn ? (
                <button
                  onClick={() => navigate("/dashboard")}
                  className="btn btn-primary btn-sm rounded-xl px-4 shadow-sm"
                >
                  Go to Dashboard
                  <ArrowRightIcon className="size-4 ml-1" />
                </button>
              ) : (
                <div className="hidden items-center gap-2 sm:flex">
                  <AuthIntentButton
                    role="student"
                    action="signin"
                    className="btn btn-outline btn-sm rounded-xl border-base-content/15 px-4 text-base-content/70 hover:bg-base-200 hover:text-base-content"
                  >
                    Student sign in
                  </AuthIntentButton>
                  <AuthIntentButton
                    role="teacher"
                    action="signin"
                    className="btn btn-primary btn-sm rounded-xl px-4 shadow-sm"
                  >
                    Teacher sign in
                  </AuthIntentButton>
                </div>
              )}
            </div>
          </div>
        </PageContainer>
      </nav>

      <div className="relative overflow-hidden border-b border-base-200 bg-gradient-to-br from-base-100 via-base-100 to-base-200/50">
        <div className="absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.14),transparent_45%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.1),transparent_35%)]" />
        <PageContainer className="relative py-20 lg:py-24">
          <div className="grid items-start gap-14 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                <ZapIcon className="size-4" />
                <span>Live-first teaching platform</span>
              </div>

              <h1 className="text-5xl font-black leading-[1.04] tracking-tight text-base-content md:text-6xl xl:text-7xl">
                A cleaner way to teach live, run cohorts, and learn together.
              </h1>

              <p className="max-w-2xl text-lg leading-relaxed text-base-content/65">
                Cloud Desk brings live classrooms, course operations, and
                collaborative coding into one product. Teachers and students get
                distinct entry flows, clearer workspaces, and a familiar modern
                experience.
              </p>

              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-base-content/10 bg-base-100 px-4 py-2 text-sm font-semibold text-base-content/75 shadow-sm">
                  <VideoIcon className="size-4 text-primary" />
                  Live Video Classes
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-base-content/10 bg-base-100 px-4 py-2 text-sm font-semibold text-base-content/75 shadow-sm">
                  <Code2Icon className="size-4 text-secondary" />
                  Interactive Coding
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-base-content/10 bg-base-100 px-4 py-2 text-sm font-semibold text-base-content/75 shadow-sm">
                  <BookOpenIcon className="size-4 text-accent" />
                  Course Management
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    icon: UsersIcon,
                    label: "Two clear roles",
                    copy: "Teacher and student journeys start from distinct entry points.",
                  },
                  {
                    icon: ShieldCheckIcon,
                    label: "Role-aware workspaces",
                    copy: "Dashboards, catalogs, and classrooms adapt without feeling fragmented.",
                  },
                  {
                    icon: SparklesIcon,
                    label: "Normal product UX",
                    copy: "Cleaner navigation, calmer surfaces, and clearer actions across the app.",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-base-content/10 bg-base-100/80 p-5 shadow-sm"
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <item.icon className="size-5" />
                    </div>
                    <p className="font-semibold text-base-content">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-base-content/62">
                      {item.copy}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-base-content/10 bg-base-100/95 p-6 shadow-2xl shadow-primary/5 lg:p-7">
              <div className="rounded-[1.5rem] border border-base-content/10 bg-gradient-to-br from-base-100 to-base-200/70 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Choose your entry
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-base-content">
                  Sign in the way you actually use the platform.
                </h2>
                <p className="mt-3 text-sm leading-6 text-base-content/62">
                  Teachers and students now enter through separate paths, while
                  keeping the same secure authentication backend.
                </p>
              </div>

              <div className="mt-5 space-y-4">
                {authCards.map((card) => (
                  <div
                    key={card.role}
                    className={`rounded-[1.6rem] border border-base-content/10 bg-gradient-to-br ${card.accentClass} p-5`}
                  >
                    <div className="rounded-[1.35rem] bg-base-100/92 p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-base-content/45">
                        {card.eyebrow}
                      </p>
                      <h3 className="mt-2 text-2xl font-black text-base-content">
                        {card.title}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-base-content/62">
                        {card.description}
                      </p>

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <AuthIntentButton
                          role={card.role}
                          action="signup"
                          className="btn btn-primary flex-1 rounded-xl shadow-sm"
                        >
                          {card.primaryLabel}
                          <ArrowRightIcon className="ml-1 size-4" />
                        </AuthIntentButton>
                        <AuthIntentButton
                          role={card.role}
                          action="signin"
                          className="btn btn-outline flex-1 rounded-xl border-base-content/15"
                        >
                          {card.secondaryLabel}
                        </AuthIntentButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PageContainer>
      </div>

      <PageContainer className="py-24">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-base-content md:text-4xl">
            One platform for classrooms, cohorts, and collaborative coding.
          </h2>
          <p className="text-lg font-medium text-base-content/60">
            Built so the product feels like a normal, high-quality learning
            platform instead of a collection of disconnected tools.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-base-100 border border-base-200 hover:border-primary/30 transition-colors shadow-sm hover:shadow-md">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <VideoIcon className="size-7 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-base-content">
              Live Studio Rooms
            </h3>
            <p className="text-base-content/60 font-medium leading-relaxed">
              Video, chat, and teaching tools stay inside the course workspace
              so live classes feel organized from the start.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-base-100 border border-base-200 hover:border-secondary/30 transition-colors shadow-sm hover:shadow-md">
            <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mb-6">
              <Code2Icon className="size-7 text-secondary" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-base-content">
              Multiplayer Editor
            </h3>
            <p className="text-base-content/60 font-medium leading-relaxed">
              Teachers and students can solve problems together with
              synchronized code editing, execution, and language-aware sessions.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-base-100 border border-base-200 hover:border-accent/30 transition-colors shadow-sm hover:shadow-md">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
              <UsersIcon className="size-7 text-accent" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-base-content">
              Cohort Discovery
            </h3>
            <p className="text-base-content/60 font-medium leading-relaxed">
              Discover teachers, request access to live courses, and build
              structured learning routines around scheduled classes.
            </p>
          </div>
        </div>
      </PageContainer>

      <Footer />
    </div>
  );
}

export default HomePage;
