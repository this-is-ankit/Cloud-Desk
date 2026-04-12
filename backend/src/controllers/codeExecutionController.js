import { inngest } from "../lib/inngest.js";
import { getNormalizedSessionLanguage } from "../lib/sessionLanguage.js";

const LANGUAGE_CONFIG = {
  javascript: { language: "javascript", version: "18.15.0" },
  python: { language: "python", version: "3.10.0" },
  java: { language: "java", version: "15.0.2" },
  cpp: { language: "c++", version: "10.2.0" },
  c: { language: "c", version: "10.2.0" },
  rust: { language: "rust", version: "1.68.2" },
  go: { language: "go", version: "1.16.2" },
};

export async function executeCode(req, res) {
  try {
    const { language, code, roomId } = req.body;
    const userId = req.auth?.userId || req.userId; // Handle both clerk and custom auth

    if (!language || typeof code !== "string" || !roomId) {
      return res
        .status(400)
        .json({ message: "language, code, and roomId are required" });
    }

    if (code.length > 100_000) {
      return res.status(400).json({ message: "Code is too large" });
    }

    const normalizedLanguage = getNormalizedSessionLanguage(language);
    const config = normalizedLanguage ? LANGUAGE_CONFIG[normalizedLanguage] : null;
    
    if (!config) {
      return res
        .status(400)
        .json({ message: `Unsupported language: ${language}` });
    }

    // Trigger asynchronous execution
    await inngest.send({
      name: "code/execute.requested",
      data: {
        roomId,
        userId,
        language: normalizedLanguage,
        code,
      },
    });

    return res.status(202).json({ message: "Execution started" });
  } catch (error) {
    console.error("Code execution error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
