// Piston API is a service for code execution
import axiosInstance from "./axios";

const PISTON_API = "https://emkc.org/api/v2/piston";

const LANGUAGE_VERSIONS = {
  javascript: { language: "javascript", version: "18.15.0" },
  python: { language: "python", version: "3.10.0" },
  java: { language: "java", version: "15.0.2" },

  cpp: { language: "c++", version: "10.2.0" },
  c: { language: "c", version: "10.2.0" },
  rust: { language: "rust", version: "1.68.2" },
  go: { language: "go", version: "1.16.2" },
};

/**
 * @param {string} language - programming language
 * @param {string} code - source code to executed
 * @returns {Promise<{success:boolean, output?:string, error?: string}>}
 */
export async function executeCode(language, code) {
  try {
    const languageConfig = LANGUAGE_VERSIONS[language];

    if (!languageConfig) {
      return {
        success: false,
        error: `Unsupported language: ${language}`,
      };
    }

    let data = null;
    try {
      const response = await axiosInstance.post("/code/execute", { language, code });
      data = response.data;
    } catch {
      const response = await fetch(`${PISTON_API}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: languageConfig.language,
          version: languageConfig.version,
          files: [
            {
              name: `main.${getFileExtension(language)}`,
              content: code,
            },
          ],
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Execution failed (${response.status}).`,
        };
      }

      data = await response.json();
    }

    const output = data.run.output || "";
    const stderr = data.run.stderr || "";

    if (stderr) {
      return {
        success: false,
        output: output,
        error: stderr,
      };
    }

    return {
      success: true,
      output: output || "No output",
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to execute code: ${error.message}`,
    };
  }
}

function getFileExtension(language) {
  const extensions = {
    javascript: "js",
    python: "py",
    java: "java",

    cpp: "cpp",
    c: "c",
    rust: "rs",
    go: "go",
  };

  return extensions[language] || "txt";
}
