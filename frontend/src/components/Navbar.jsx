import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  BookOpenIcon,
  LayoutDashboardIcon,
  SparklesIcon,
} from "./icons/ModernIcons";
import { LibraryBig, UserRound, Menu, X } from "lucide-react";
import { UserButton } from "@clerk/clerk-react";
import ThemeToggle from "./ThemeToggle";
import { useAppUser } from "../hooks/useAppUser";
import { useRuntimeAuth } from "../hooks/useRuntimeAuth";
import PageContainer from "./PageContainer";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAppUser();
  const { authMode, signOut, user } = useRuntimeAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  const navItems = [
    { to: "/dashboard", icon: LayoutDashboardIcon, label: "Dashboard" },
    { to: "/courses", icon: LibraryBig, label: "Courses" },
    { to: "/problems", icon: BookOpenIcon, label: "Practice" },
    { to: "/teachers", icon: UserRound, label: "Teachers" },
  ];

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const NavLink = ({ to, icon, label }) => {
    const active = isActive(to);
    const IconComponent = icon;
    return (
      <Link
        to={to}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors duration-200
          ${
            active
              ? "bg-primary text-primary-content shadow-sm shadow-primary/20"
              : "text-base-content/70 hover:bg-base-200/80 hover:text-base-content"
          }`}
      >
        <IconComponent className="w-4 h-4" />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-base-content/10 bg-base-100/80 backdrop-blur-xl">
      <PageContainer className="py-4">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="group flex items-center gap-3 transition-transform duration-200 hover:scale-[1.02]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-content shadow-sm">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-lg font-bold tracking-tight text-base-content leading-none">
                Cloud Desk
              </span>
              <span className="text-[11px] font-medium text-base-content/50 uppercase tracking-widest mt-1">
                Platform
              </span>
            </div>
          </Link>

          <div className="hidden items-center gap-1 rounded-2xl border border-base-content/10 bg-base-200/50 p-1 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            <Link
              to="/settings/profile"
              className="hidden rounded-2xl border border-base-content/10 bg-base-200/50 px-4 py-2 text-sm font-semibold text-base-content/75 transition hover:bg-base-200 hover:text-base-content lg:inline-flex"
            >
              {role === "teacher" ? "Teacher profile" : "Profile"}
            </Link>

            {authMode === "dev" ? (
              <button
                className="btn btn-outline btn-sm rounded-xl border-base-content/15 text-base-content/75 hover:bg-base-200"
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
              >
                Log out ({user?.firstName || "Dev"})
              </button>
            ) : (
              <UserButton
                appearance={{
                  elements: {
                    avatarBox:
                      "w-10 h-10 rounded-xl border border-base-content/10 shadow-sm",
                  },
                }}
              />
            )}

            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square rounded-xl md:hidden"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="mt-4 rounded-3xl border border-base-content/10 bg-base-100 p-3 shadow-xl md:hidden">
            <div className="space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                />
              ))}
              <Link
                to="/settings/profile"
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive("/settings/profile")
                    ? "bg-primary text-primary-content shadow-sm shadow-primary/20"
                    : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
                }`}
              >
                <UserRound className="w-4 h-4" />
                <span>
                  {role === "teacher" ? "Teacher profile" : "Profile"}
                </span>
              </Link>
            </div>
          </div>
        )}
      </PageContainer>
    </nav>
  );
}
