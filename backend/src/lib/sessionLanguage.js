export const DEFAULT_SESSION_LANGUAGE = "javascript";

const SESSION_LANGUAGE_LABELS = {
  javascript: "JavaScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
  c: "C",
  rust: "Rust",
  go: "Go",
};

const LANGUAGE_ALIASES = {
  javascript: "javascript",
  js: "javascript",
  node: "javascript",
  nodejs: "javascript",
  ecmascript: "javascript",
  python: "python",
  py: "python",
  java: "java",
  cpp: "cpp",
  "c++": "cpp",
  cplusplus: "cpp",
  cxx: "cpp",
  c: "c",
  rust: "rust",
  rs: "rust",
  go: "go",
  golang: "go",
};

const normalizeLanguageToken = (value) =>
  typeof value === "string" ? value.trim().toLowerCase().replace(/[.\s_-]+/g, "") : "";

export const getNormalizedSessionLanguage = (value) => {
  const token = normalizeLanguageToken(value);
  return LANGUAGE_ALIASES[token] || null;
};

export const normalizeSessionLanguage = (value, fallback = DEFAULT_SESSION_LANGUAGE) =>
  getNormalizedSessionLanguage(value) || fallback;

export const getSessionLanguageLabel = (value) =>
  SESSION_LANGUAGE_LABELS[normalizeSessionLanguage(value)] || SESSION_LANGUAGE_LABELS[DEFAULT_SESSION_LANGUAGE];
