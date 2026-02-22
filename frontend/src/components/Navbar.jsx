import { Link, useLocation } from "react-router";
import { BookOpenIcon, LayoutDashboardIcon, SparklesIcon } from "./icons/ModernIcons";
import { UserButton } from "@clerk/clerk-react";
import ThemeToggle from "./ThemeToggle";

function Navbar() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  const isSessionRoute = location.pathname.startsWith("/session/");
  const isProblemRoute = location.pathname.startsWith("/problem/");
  const isProblemsRoute = location.pathname === "/problems";
  const isDashboardRoute = location.pathname === "/dashboard";

  const pageTitle = isSessionRoute
    ? "Live Session"
    : isProblemRoute
      ? "Problem Workspace"
      : isProblemsRoute
        ? "Practice Problems"
        : isDashboardRoute
          ? "Dashboard"
          : "Cloud Desk";

  const modeBadgeLabel = isSessionRoute
    ? "Interview mode"
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
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary shadow-lg">
            <SparklesIcon className="size-6 text-white" />
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
            className={`px-4 py-2.5 rounded-lg transition-all duration-200 
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
            to="/dashboard"
            className={`px-4 py-2.5 rounded-lg transition-all duration-200 
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

          <div className="ml-2 mt-1">
            <UserButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
export default Navbar;
