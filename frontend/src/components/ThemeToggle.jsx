import { LaptopIcon, MoonIcon, SunIcon } from "./icons/ModernIcons";
import { useTheme } from "../context/ThemeProvider";

function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div className="inline-flex items-center rounded-2xl border border-base-content/10 bg-base-100/80 p-1 shadow-sm">
      <button
        type="button"
        onClick={() => setMode("light")}
        className={`btn btn-sm border-0 px-3 ${mode === "light" ? "btn-primary shadow-sm" : "btn-ghost text-base-content/60"}`}
        aria-label="Switch to light theme"
        title="Light"
      >
        <SunIcon className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => setMode("dark")}
        className={`btn btn-sm border-0 px-3 ${mode === "dark" ? "btn-primary shadow-sm" : "btn-ghost text-base-content/60"}`}
        aria-label="Switch to dark theme"
        title="Dark"
      >
        <MoonIcon className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => setMode("system")}
        className={`btn btn-sm border-0 px-3 ${mode === "system" ? "btn-primary shadow-sm" : "btn-ghost text-base-content/60"}`}
        aria-label="Use system theme"
        title="System"
      >
        <LaptopIcon className="size-4" />
      </button>
    </div>
  );
}

export default ThemeToggle;
