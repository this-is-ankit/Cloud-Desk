import { ArrowRightIcon, ZapIcon } from "./icons/ModernIcons";
import { useRuntimeAuth } from "../hooks/useRuntimeAuth";

function WelcomeSection({ role = "student", primaryAction, secondaryAction, tertiaryAction }) {
  const { user } = useRuntimeAuth();
  const isTeacher = role === "teacher";

  return (
    <div className="relative overflow-hidden border-b border-base-content/5 bg-gradient-to-br from-base-200 to-base-100">
      <div className="relative max-w-[1320px] mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                {isTeacher ? "Teacher Workspace" : "Student Workspace"}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-base-content tracking-tight mt-2">
              Welcome back, <span className="text-primary">{user?.firstName || "there"}</span>!
            </h1>
            <p className="text-xl text-base-content/60 mt-3 font-medium max-w-xl">
              {isTeacher
                ? "Manage live courses, approve students, schedule classes, and launch teaching rooms from one place."
                : "Track your approved courses, upcoming live classes, assignments, and classroom access from your dashboard."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {secondaryAction && (
              <button className="btn btn-outline border-base-content/20 hover:bg-base-200 rounded-xl px-6" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </button>
            )}
            {tertiaryAction && (
              <button className="btn btn-outline border-base-content/20 hover:bg-base-200 rounded-xl px-6" onClick={tertiaryAction.onClick}>
                {tertiaryAction.label}
              </button>
            )}
            {primaryAction && (
              <button
                onClick={primaryAction.onClick}
                className="btn btn-primary rounded-xl px-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
              >
                <ZapIcon className="size-4" />
                <span>{primaryAction.label}</span>
                <ArrowRightIcon className="size-4 ml-1" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeSection;
