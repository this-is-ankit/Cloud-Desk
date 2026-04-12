import { inngest } from "./client.js";
import { connectDB } from "../db.js";
import Session from "../../models/Session.js";
import { getRedisClient, getRedisEmitter } from "../redis.js";
import { streamClient } from "../stream.js";

// Helper for emitting to Socket.IO from background
const emitToRoom = async (roomId, event, data) => {
  const emitter = await getRedisEmitter();
  emitter.to(roomId).emit(event, data);
};

export const scheduleWhiteboardPersistence = inngest.createFunction(
  { id: "schedule-whiteboard-persistence", concurrency: 1 },
  { event: "session/whiteboard.persist.scheduled" },
  async ({ event, step }) => {
    const { roomId, delayMs } = event.data;
    
    await step.sleep("wait-for-debounce", `${delayMs}ms`);
    
    await step.run("persist-whiteboard", async () => {
      await connectDB();
      const redis = await getRedisClient();
      const stateRaw = await redis.get(`room:${roomId}:whiteboard`);
      if (!stateRaw) return;
      
      const state = JSON.parse(stateRaw);
      await Session.findByIdAndUpdate(roomId, {
        whiteboardElements: state.elements || [],
        whiteboardAppState: state.appState || {},
        whiteboardIsOpen: Boolean(state.isOpen),
        whiteboardWriteMode: state.writeMode || "host-only",
        whiteboardWriters: state.writerIds || [],
      });
    });
  }
);

export const scheduleCircuitPersistence = inngest.createFunction(
  { id: "schedule-circuit-persistence", concurrency: 1 },
  { event: "session/circuit.persist.scheduled" },
  async ({ event, step }) => {
    const { roomId, delayMs } = event.data;
    
    await step.sleep("wait-for-debounce", `${delayMs}ms`);
    
    await step.run("persist-circuit", async () => {
      await connectDB();
      const redis = await getRedisClient();
      const stateRaw = await redis.get(`room:${roomId}:circuit`);
      if (!stateRaw) return;
      
      const state = JSON.parse(stateRaw);
      await Session.findByIdAndUpdate(roomId, {
        circuitState: state || { components: [], wires: [] },
      });
    });
  }
);

export const handleHostTimeout = inngest.createFunction(
  { id: "handle-host-timeout" },
  { event: "session/host.disconnected" },
  async ({ event, step }) => {
    const { roomId, delayMs } = event.data;
    
    await step.sleep("wait-for-timeout", `${delayMs}ms`);
    
    await step.run("check-and-complete-session", async () => {
      await connectDB();
      const session = await Session.findById(roomId);
      if (!session || session.status === "completed") return;
      
      const deadline = session.livestream?.hostDisconnectDeadline;
      if (!deadline || new Date(deadline).getTime() > Date.now()) return;
      
      // Complete session
      session.status = "completed";
      if (session.livestream) {
        session.livestream.isLive = false;
        session.livestream.endedAt = new Date();
        session.livestream.hostDisconnectDeadline = null;
      }
      await session.save();
      
      if (session.callId) {
        try {
          const call = streamClient.video.call("default", session.callId);
          await call.stopLive().catch(() => {});
          await call.delete({ hard: true }).catch(() => {});
        } catch (error) {
          console.log("Stream cleanup error in background:", error.message);
        }
      }

      await emitToRoom(roomId, "livestream-state", {
        isLive: false,
        status: "completed",
        reason: "host-timeout"
      });
    });
  }
);
