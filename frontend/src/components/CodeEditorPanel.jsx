import { useRef, useEffect, memo } from "react";
import Editor from "@monaco-editor/react";
import { Loader2Icon, PlayIcon } from "./icons/ModernIcons";
import { useTheme } from "../context/ThemeProvider";
import { LANGUAGE_CONFIG } from "../data/problems";
import {
  getSessionLanguageConfig,
  normalizeSessionLanguage,
} from "../lib/sessionLanguage";

const CodeEditorPanel = memo(({
  selectedLanguage,
  code,
  isRunning,
  onLanguageChange,
  onCodeChange,
  onRunCode,
}) => {
  const { isDark } = useTheme();
  const editorRef = useRef(null);
  const activeLanguageConfig = getSessionLanguageConfig(selectedLanguage);
  const activeLanguage = normalizeSessionLanguage(selectedLanguage);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    if (editorRef.current) {
      const currentModelValue = editorRef.current.getValue();
      
      if (code !== currentModelValue) {
        // We only want to force-set value if the editor isn't focused 
        // OR if the change is significant (not just a single character from our own echo)
        const isFocused = editorRef.current.hasTextFocus();
        if (!isFocused || Math.abs((code?.length || 0) - (currentModelValue?.length || 0)) > 10) {
          editorRef.current.setValue(code || "");
        }
      }
    }
  }, [code]);

  return (
    <div className="h-full bg-base-100 flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 bg-base-100 border-b border-base-content/5">
        <div className="flex items-center gap-3">
          <img
            src={activeLanguageConfig.icon}
            alt={activeLanguageConfig.name}
            className="size-6"
          />
          <select
            className="select select-sm"
            value={activeLanguage}
            onChange={onLanguageChange}
          >
            {Object.entries(LANGUAGE_CONFIG).map(([key, lang]) => (
              <option key={key} value={key}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn btn-primary btn-sm gap-2"
          disabled={isRunning}
          onClick={onRunCode}
        >
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
          defaultValue={code}
          onMount={handleEditorDidMount}
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
});

CodeEditorPanel.displayName = "CodeEditorPanel";

export default CodeEditorPanel;
