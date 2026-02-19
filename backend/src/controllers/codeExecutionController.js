import { ENV } from "../lib/env.js";

const LOCAL_PISTON_API = "http://localhost:2000/api/v2/piston/execute";
const PUBLIC_PISTON_API = "https://emkc.org/api/v2/piston/execute";
const DEFAULT_JUDGE0_API = "https://ce.judge0.com";

const LANGUAGE_CONFIG = {
  javascript: { language: "javascript", version: "18.15.0" },
  python: { language: "python", version: "3.10.0" },
  java: { language: "java", version: "15.0.2" },
  cpp: { language: "c++", version: "10.2.0" },
  c: { language: "c", version: "10.2.0" },
  rust: { language: "rust", version: "1.68.2" },
  go: { language: "go", version: "1.16.2" },
};

const getFileExtension = (language) => {
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
};

const buildPistonLikeResponse = ({ output = "", stderr = "" }) => ({
  run: {
    output,
    stderr,
  },
});

const fetchJudge0LanguageId = async (apiBase, language) => {
  const response = await fetch(`${apiBase}/languages`);
  if (!response.ok) {
    throw new Error(`Judge0 languages failed (${response.status})`);
  }

  const languages = await response.json();
  const normalized = Array.isArray(languages) ? languages : [];

  const matchers = {
    javascript: [/javascript/i, /node/i],
    python: [/python/i],
    java: [/java/i],
    cpp: [/c\+\+|cpp/i],
    c: [/\bc\b/],
    rust: [/rust/i],
    go: [/\bgo\b|golang/i],
  };

  const rules = matchers[language] || [];
  const match = normalized.find((item) => {
    const name = item?.name || "";
    return rules.every((rule) => rule.test(name));
  });

  if (!match?.id) {
    throw new Error(`Judge0 language not found: ${language}`);
  }

  return match.id;
};

const executeWithJudge0 = async ({ language, code }) => {
  const apiBase = ENV.JUDGE0_API_URL || DEFAULT_JUDGE0_API;
  const languageId = await fetchJudge0LanguageId(apiBase, language);

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (ENV.JUDGE0_AUTH_TOKEN) {
    headers.Authorization = `Bearer ${ENV.JUDGE0_AUTH_TOKEN}`;
  }

  const submissionResponse = await fetch(`${apiBase}/submissions?wait=true`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      language_id: languageId,
      source_code: code,
    }),
  });

  const text = await submissionResponse.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!submissionResponse.ok) {
    const details = data?.message || text || `HTTP ${submissionResponse.status}`;
    throw new Error(`Judge0 execution failed: ${details}`);
  }

  const output = data?.stdout || "";
  const stderr =
    data?.compile_output ||
    data?.stderr ||
    data?.message ||
    (data?.status?.id !== 3 ? data?.status?.description : "") ||
    "";

  return buildPistonLikeResponse({ output, stderr });
};

export async function executeCode(req, res) {
  try {
    const { language, code } = req.body;

    if (!language || typeof code !== "string") {
      return res.status(400).json({ message: "language and code are required" });
    }

    if (code.length > 100_000) {
      return res.status(400).json({ message: "Code is too large" });
    }

    const config = LANGUAGE_CONFIG[language];
    if (!config) {
      return res.status(400).json({ message: `Unsupported language: ${language}` });
    }

    const endpoints = [
      ENV.PISTON_API_URL,
      LOCAL_PISTON_API,
      PUBLIC_PISTON_API,
    ].filter(Boolean);

    const payload = {
      language: config.language,
      version: config.version,
      files: [
        {
          name: `main.${getFileExtension(language)}`,
          content: code,
        },
      ],
    };

    let lastError = null;
    for (const endpoint of endpoints) {
      try {
        const pistonResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "Cloud-Desk/1.0",
          },
          body: JSON.stringify(payload),
        });

        const responseText = await pistonResponse.text();
        let data = null;
        try {
          data = JSON.parse(responseText);
        } catch {
          data = null;
        }

        if (pistonResponse.ok) {
          return res.status(200).json(data);
        }

        const details = data?.message || responseText || `HTTP ${pistonResponse.status}`;
        lastError = `${endpoint} -> ${details}`;
      } catch (error) {
        lastError = `${endpoint} -> ${error.message}`;
      }
    }

    try {
      const judge0Result = await executeWithJudge0({ language, code });
      return res.status(200).json(judge0Result);
    } catch (judge0Error) {
      lastError = `${lastError || ""} | Judge0 -> ${judge0Error.message}`.trim();
    }

    return res.status(503).json({
      message: "Code execution is unavailable",
      details:
        "Public Piston is whitelist-only. Configure PISTON_API_URL to your own Piston instance or set JUDGE0_API_URL. " +
        (lastError ? `Last error: ${lastError}` : ""),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to execute code",
      details: error.message,
    });
  }
}
