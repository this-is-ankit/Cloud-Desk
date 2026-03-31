import { ArrowRightIcon, ZapIcon } from "./icons/ModernIcons";
import { useRuntimeAuth } from "../hooks/useRuntimeAuth";
import PageContainer from "./PageContainer";

function WelcomeSection({ role = "student", primaryAction, secondaryAction, tertiaryAction }) {
  const { user } = useRuntimeAuth();
  const isTeacher = role === "teacher";

  return (
    <div className="relative overflow-hidden border-b border-base-content/10 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.1),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.7),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.35),rgba(15,23,42,0))]">
      <PageContainer className="relative py-12">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                {isTeacher ? "Teacher Workspace" : "Student Workspace"}
              </span>
            </div>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-base-content md:text-5xl">
              Welcome back, <span className="text-primary">{user?.firstName || "there"}</span>
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-base-content/62">
              {isTeacher
                ? "Manage live courses, approve students, schedule classes, and launch teaching rooms from one place."
                : "Track your approved courses, upcoming live classes, assignments, and classroom access from your dashboard."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
            {secondaryAction && (
              <button className="btn btn-outline h-12 rounded-xl border-base-content/15 bg-base-100/80 px-5" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </button>
            )}
            {tertiaryAction && (
              <button className="btn btn-outline h-12 rounded-xl border-base-content/15 bg-base-100/80 px-5" onClick={tertiaryAction.onClick}>
                {tertiaryAction.label}
              </button>
            )}
            {primaryAction && (
              <button
                onClick={primaryAction.onClick}
                className="btn btn-primary h-12 rounded-xl px-6 shadow-lg shadow-primary/20 transition-all sm:col-span-2"
              >
                <ZapIcon className="size-4" />
                <span>{primaryAction.label}</span>
                <ArrowRightIcon className="size-4 ml-1" />
              </button>
            )}
          </div>
        </div>
      </PageContainer>
    </div>
  );
}

export default WelcomeSection;
