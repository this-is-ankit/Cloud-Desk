import { inngest } from "../lib/inngest.js";
import { getNormalizedSessionLanguage } from "../lib/sessionLanguage.js";
import { runCode } from "../lib/codeRunner.js";
import { ENV } from "../lib/env.js";

export async function executeCode(req, res) {
  try {
    const { language, code, roomId } = req.body;
    
    let clerkId = null;
    if (typeof req.auth === "function") {
      clerkId = req.auth().userId;
    } else if (req.auth) {
      clerkId = req.auth.userId;
    }
    
    const userId = clerkId || req.userId; 

    if (!language || typeof code !== "string" || !roomId) {
      return res
        .status(400)
        .json({ message: "language, code, and roomId are required" });
    }

    if (code.length > 100_000) {
      return res.status(400).json({ message: "Code is too large" });
    }

    const normalizedLanguage = getNormalizedSessionLanguage(language);
    if (!normalizedLanguage) {
      return res
        .status(400)
        .json({ message: `Unsupported language: ${language}` });
    }

    // HYBRID MODE: If Redis is missing, run synchronously to ensure results reach the UI
    if (!ENV.REDIS_URL) {
      console.log("REDIS_URL missing: Running code execution synchronously.");
      const result = await runCode({ language: normalizedLanguage, code });
      return res.status(200).json(result);
    }

    // Trigger asynchronous execution via Inngest (Production Mode)
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
