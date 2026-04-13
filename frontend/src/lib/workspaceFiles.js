const LANGUAGE_BY_EXTENSION = {
  js: "javascript",
  jsx: "javascript",
  ts: "javascript",
  tsx: "javascript",
  py: "python",
  java: "java",
  c: "c",
  cpp: "cpp",
  h: "c",
  rs: "rust",
  go: "go",
  json: "json",
  md: "markdown",
  html: "html",
  css: "css",
};

export const inferWorkspaceFileLanguage = (path, fallback = "plaintext") => {
  const extension = path.split(".").pop()?.toLowerCase?.() || "";
  return LANGUAGE_BY_EXTENSION[extension] || fallback;
};

export const sortWorkspaceFiles = (files = []) =>
  [...files].sort((a, b) => a.path.localeCompare(b.path));
