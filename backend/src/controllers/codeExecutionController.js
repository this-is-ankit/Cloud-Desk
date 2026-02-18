const PISTON_API = "https://emkc.org/api/v2/piston/execute";

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

    const pistonResponse = await fetch(PISTON_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: config.language,
        version: config.version,
        files: [
          {
            name: `main.${getFileExtension(language)}`,
            content: code,
          },
        ],
      }),
    });

    const responseText = await pistonResponse.text();
    let data = null;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = null;
    }

    if (!pistonResponse.ok) {
      return res.status(502).json({
        message: "Code execution service failed",
        details: data?.message || responseText || `HTTP ${pistonResponse.status}`,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to execute code",
      details: error.message,
    });
  }
}
