import { Link, useLocation, useNavigate } from "react-router";
import { BookOpenIcon, LayoutDashboardIcon, SparklesIcon } from "./icons/ModernIcons";
import { LibraryBig, UserRound } from "lucide-react";
import { UserButton } from "@clerk/clerk-react";
import ThemeToggle from "./ThemeToggle";
import { useAppUser } from "../hooks/useAppUser";
import { useRuntimeAuth } from "../hooks/useRuntimeAuth";

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAppUser();
  const { authMode, signOut, user } = useRuntimeAuth();

  const isActive = (path) => location.pathname === path;
  const isSessionRoute = location.pathname.startsWith("/session/");
  const isProblemRoute = location.pathname.startsWith("/problem/");
  const isProblemsRoute = location.pathname === "/problems";
  const isDashboardRoute = location.pathname === "/dashboard";
  const isCoursesRoute = location.pathname === "/courses";
  const isTeachersRoute = location.pathname === "/teachers";
  const isSettingsRoute = location.pathname === "/settings/profile";

  const pageTitle = isSessionRoute
    ? "Live Session"
    : isProblemRoute
      ? "Problem Workspace"
      : isCoursesRoute
        ? "Courses"
      : isProblemsRoute
        ? "Practice Problems"
        : isDashboardRoute
          ? "Dashboard"
          : "Cloud Desk";

  const modeBadgeLabel = isSessionRoute
    ? "Interview mode"
      : isCoursesRoute
        ? "Learning mode"
      : isTeachersRoute
        ? "Discovery mode"
      : isProblemRoute || isProblemsRoute
        ? "Practice mode"
        : "Studio mode";

  return (
    <nav className="sticky top-0 z-50 border-b border-base-300/80 glass-surface">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link
          to="/"
          className="group flex items-center gap-3 transition-transform duration-200 hover:scale-[1.02]"
        >
          <div className="icon-box size-10 shadow-sm">
            <SparklesIcon className="size-6 text-base-content" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-primary">Cloud Desk</span>
            <span className="-mt-1 text-xs text-base-content/60">Code Together</span>
          </div>
        </Link>

        <div className="hidden items-center gap-3 lg:flex">
          <h1 className="text-lg font-semibold text-base-content">{pageTitle}</h1>
          <span className="badge badge-outline font-medium">{modeBadgeLabel}</span>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <Link
            to="/problems"
            className={`px-4 py-2.5 rounded-none transition-all duration-200 
              ${
                isActive("/problems")
                  ? "bg-primary text-primary-content"
                  : "hover:bg-base-200 text-base-content/70 hover:text-base-content"
              }
              
              `}
          >
            <div className="flex items-center gap-2.5">
              <BookOpenIcon className="size-4" />
              <span className="font-medium hidden sm:inline">Problems</span>
            </div>
          </Link>

          <Link
            to="/courses"
            className={`px-4 py-2.5 rounded-none transition-all duration-200 
              ${
                isActive("/courses")
                  ? "bg-primary text-primary-content"
                  : "hover:bg-base-200 text-base-content/70 hover:text-base-content"
              }
              
              `}
          >
            <div className="flex items-center gap-2.5">
              <LibraryBig className="size-4" />
              <span className="font-medium hidden sm:inline">Courses</span>
            </div>
          </Link>

          <Link
            to="/teachers"
            className={`px-4 py-2.5 rounded-none transition-all duration-200 
              ${
                isActive("/teachers")
                  ? "bg-primary text-primary-content"
                  : "hover:bg-base-200 text-base-content/70 hover:text-base-content"
              }
              
              `}
          >
            <div className="flex items-center gap-2.5">
              <UserRound className="size-4" />
              <span className="font-medium hidden sm:inline">Teachers</span>
            </div>
          </Link>

          <Link
            to="/dashboard"
            className={`px-4 py-2.5 rounded-none transition-all duration-200 
              ${
                isActive("/dashboard")
                  ? "bg-primary text-primary-content"
                  : "hover:bg-base-200 text-base-content/70 hover:text-base-content"
              }
              
              `}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboardIcon className="size-4" />
              <span className="font-medium hidden sm:inline">Dashboard</span>
            </div>
          </Link>

          <div className="ml-2 hidden sm:block">
            <ThemeToggle />
          </div>

          <Link
            to="/settings/profile"
            className={`hidden px-4 py-2.5 rounded-none transition-all duration-200 md:block 
              ${
                isSettingsRoute
                  ? "bg-primary text-primary-content"
                  : "hover:bg-base-200 text-base-content/70 hover:text-base-content"
              }
              
              `}
          >
            <span className="font-medium">{role === "teacher" ? "Teacher Profile" : "Profile"}</span>
          </Link>

          <div className="ml-2 mt-1">
            {authMode === "dev" ? (
              <button
                className="btn btn-outline btn-sm rounded-xl"
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
              >
                {user?.firstName || "Demo"} Sign Out
              </button>
            ) : (
              <UserButton />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
export default Navbar;
