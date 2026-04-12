import { inngest } from "./client.js";
import { ENV } from "../env.js";
import { getRedisEmitter } from "../redis.js";
import { getNormalizedSessionLanguage } from "../sessionLanguage.js";

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
  run: { output, stderr },
});

const executeWithJudge0 = async ({ language, code }) => {
  const apiBase = ENV.JUDGE0_API_URL || DEFAULT_JUDGE0_API;
  
  // Fetch languages to get ID (simple version)
  const langResponse = await fetch(`${apiBase}/languages`);
  const languages = await langResponse.json();
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
  const match = languages.find(item => rules.every(rule => rule.test(item.name)));
  if (!match) throw new Error(`Judge0 language not found: ${language}`);

  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (ENV.JUDGE0_AUTH_TOKEN) headers.Authorization = `Bearer ${ENV.JUDGE0_AUTH_TOKEN}`;

  const submissionResponse = await fetch(`${apiBase}/submissions?wait=true`, {
    method: "POST",
    headers,
    body: JSON.stringify({ language_id: match.id, source_code: code }),
  });

  const data = await submissionResponse.json();
  const output = data.stdout || "";
  const stderr = data.compile_output || data.stderr || data.message || (data.status?.id !== 3 ? data.status?.description : "") || "";

  return buildPistonLikeResponse({ output, stderr });
};

export const executeCodeJob = inngest.createFunction(
  { id: "execute-code-job" },
  { event: "code/execute.requested" },
  async ({ event, step }) => {
    const { roomId, userId, language, code } = event.data;
    const normalizedLanguage = getNormalizedSessionLanguage(language);
    const config = LANGUAGE_CONFIG[normalizedLanguage];

    const result = await step.run("run-code", async () => {
      const endpoints = [ENV.PISTON_API_URL, LOCAL_PISTON_API, PUBLIC_PISTON_API].filter(Boolean);
      const payload = {
        language: config.language,
        version: config.version,
        files: [{ name: `main.${getFileExtension(normalizedLanguage)}`, content: code }],
      };

      for (const endpoint of endpoints) {
        try {
          const resp = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (resp.ok) return await resp.json();
        } catch (e) { /* continue */ }
      }

      return await executeWithJudge0({ language: normalizedLanguage, code });
    });

    await step.run("broadcast-result", async () => {
      const emitter = await getRedisEmitter();
      emitter.to(roomId).emit("code/execute.result", { userId, result });
    });
  }
);
