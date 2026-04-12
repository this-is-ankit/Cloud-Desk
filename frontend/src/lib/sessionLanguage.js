import { LANGUAGE_CONFIG } from "../data/problems";

export const DEFAULT_SESSION_LANGUAGE = "javascript";

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
  typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
        .replace(/[.\s_-]+/g, "")
    : "";

export const getNormalizedSessionLanguage = (value) => {
  const token = normalizeLanguageToken(value);
  return LANGUAGE_ALIASES[token] || null;
};

export const normalizeSessionLanguage = (
  value,
  fallback = DEFAULT_SESSION_LANGUAGE,
) => getNormalizedSessionLanguage(value) || fallback;

export const getSessionLanguageConfig = (value) =>
  LANGUAGE_CONFIG[normalizeSessionLanguage(value)];

export const getSessionLanguageLabel = (value) =>
  getSessionLanguageConfig(value)?.name ||
  LANGUAGE_CONFIG[DEFAULT_SESSION_LANGUAGE].name;

export const SESSION_LANGUAGE_OPTIONS = Object.entries(LANGUAGE_CONFIG).map(
  ([value, config]) => ({
    value,
    label: config.name,
  }),
);
