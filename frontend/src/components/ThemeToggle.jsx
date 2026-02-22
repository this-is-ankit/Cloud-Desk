import { LaptopIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "../context/ThemeProvider";

function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div className="join">
      <button
        type="button"
        onClick={() => setMode("light")}
        className={`join-item btn btn-sm ${mode === "light" ? "btn-primary" : "btn-ghost"}`}
        aria-label="Switch to light theme"
        title="Light"
      >
        <SunIcon className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => setMode("dark")}
        className={`join-item btn btn-sm ${mode === "dark" ? "btn-primary" : "btn-ghost"}`}
        aria-label="Switch to dark theme"
        title="Dark"
      >
        <MoonIcon className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => setMode("system")}
        className={`join-item btn btn-sm ${mode === "system" ? "btn-primary" : "btn-ghost"}`}
        aria-label="Use system theme"
        title="System"
      >
        <LaptopIcon className="size-4" />
      </button>
    </div>
  );
}

export default ThemeToggle;
