import { inngest } from "./client.js";
import { getRedisEmitter, getRedisClient } from "../redis.js";
import { runCode } from "../codeRunner.js";

export const executeCodeJob = inngest.createFunction(
  { id: "execute-code-job" },
  { event: "code/execute.requested" },
  async ({ event, step }) => {
    const { roomId, userId, language, code } = event.data;

    const result = await step.run("run-code", async () => {
      return await runCode({ language, code });
    });

    await step.run("broadcast-and-aggregate", async () => {
      const emitter = await getRedisEmitter();
      emitter.to(roomId).emit("code/execute.result", { userId, result });

      if (result.success) {
        const redis = await getRedisClient();
        const successSetKey = `room:${roomId}:success-students`;
        await redis.sAdd(successSetKey, userId);
        const successCount = await redis.sCard(successSetKey);
        
        // Broadcast success count to host
        emitter.to(roomId).emit("workspace-progress-update", { successCount });
      }
    });
  }
);
