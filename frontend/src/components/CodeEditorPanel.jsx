import Editor from "@monaco-editor/react";
import { Loader2Icon, PlayIcon } from "./icons/ModernIcons";
import { useTheme } from "../context/ThemeProvider";
import { LANGUAGE_CONFIG } from "../data/problems";
import { getSessionLanguageConfig, normalizeSessionLanguage } from "../lib/sessionLanguage";

function CodeEditorPanel({
  selectedLanguage,
  code,
  isRunning,
  onLanguageChange,
  onCodeChange,
  onRunCode,
}) {
  const { isDark } = useTheme();
  const activeLanguage = normalizeSessionLanguage(selectedLanguage);
  const activeLanguageConfig = getSessionLanguageConfig(selectedLanguage);

  return (
    <div className="h-full bg-base-300 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-base-100 border-t border-base-300">
        <div className="flex items-center gap-3">
          <img
            src={activeLanguageConfig.icon}
            alt={activeLanguageConfig.name}
            className="size-6"
          />
          <select className="select select-sm" value={activeLanguage} onChange={onLanguageChange}>
            {Object.entries(LANGUAGE_CONFIG).map(([key, lang]) => (
              <option key={key} value={key}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <button className="btn btn-primary btn-sm gap-2" disabled={isRunning} onClick={onRunCode}>
          {isRunning ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <PlayIcon className="size-4" />
              Run Code
            </>
          )}
        </button>
      </div>

      <div className="flex-1">
        <Editor
          height={"100%"}
          language={activeLanguageConfig.monacoLang}
          value={code}
          onChange={onCodeChange}
          theme={isDark ? "vs-dark" : "vs"}
          options={{
            fontFamily: "JetBrains Mono",
            fontSize: 15,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            minimap: { enabled: false },
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>
    </div>
  );
}
export default CodeEditorPanel;
