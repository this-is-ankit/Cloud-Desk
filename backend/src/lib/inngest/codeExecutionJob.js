import { inngest } from "./client.js";
import { getRedisEmitter } from "../redis.js";
import { runCode } from "../codeRunner.js";

export const executeCodeJob = inngest.createFunction(
  { id: "execute-code-job" },
  { event: "code/execute.requested" },
  async ({ event, step }) => {
    const { roomId, userId, language, code } = event.data;

    const result = await step.run("run-code", async () => {
      return await runCode({ language, code });
    });

    await step.run("broadcast-result", async () => {
      const emitter = await getRedisEmitter();
      emitter.to(roomId).emit("code/execute.result", { userId, result });
    });
  }
);
