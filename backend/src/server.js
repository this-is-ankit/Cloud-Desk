import express from "express";
import path from "path";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { serve } from "inngest/express";
import { clerkMiddleware } from "@clerk/express";

import { ENV } from "./lib/env.js";
import { connectDB } from "./lib/db.js";
import { inngest, functions } from "./lib/inngest.js";

import chatRoutes from "./routes/chatRoutes.js";
import sessionRoutes from "./routes/sessionRoute.js";

import Session from "./models/Session.js";
import { chatClient, streamClient } from "./lib/stream.js";

const app = express();
const httpServer = http.createServer(app);

const __dirname = path.resolve();

// middleware
app.use(express.json());
// credentials:true meaning?? => server allows a browser to include cookies on request
app.use(cors({ origin: ENV.CLIENT_URL, credentials: true }));
app.use(clerkMiddleware()); // this adds auth field to request object: req.auth()

const io = new Server(httpServer, {
  cors: {
    origin: ENV.CLIENT_URL, // Allow requests from your frontend
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // 1. Join Session Room
  socket.on("join-session", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);
  });

  // 2. Handle Code Changes
  socket.on("code-change", ({ roomId, code }) => {
    // Broadcast to everyone in the room EXCEPT the sender
    socket.to(roomId).emit("code-update", code);
  });

  // 3. Handle Language Changes (Optional but recommended)
  socket.on("language-change", ({ roomId, language }) => {
    socket.to(roomId).emit("language-update", language);
  });

  socket.on("disconnecting", async () => {
    // Get all rooms the user is currently in
    const rooms = [...socket.rooms];

    for (const roomId of rooms) {
      // Skip the default room (which is the socket.id itself)
      if (roomId === socket.id) continue;

      // Check remaining users in the room.
      // Since the 'disconnecting' event fires BEFORE the user actually leaves,
      // if the size is 1, it means this user is the last one.
      const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;

      if (roomSize <= 1) {
        console.log(`Room ${roomId} is becoming empty. Auto-ending session...`);
        try {
          // Find the active session
          const session = await Session.findById(roomId);
          
          if (session && session.status === "active") {
            // 1. Mark as completed in DB
            session.status = "completed";
            await session.save();

            // 2. Clean up Stream Video Call
            if (session.callId) {
              const call = streamClient.video.call("default", session.callId);
              // Use .catch to prevent crashing if call already deleted
              await call.delete({ hard: true }).catch((err) => 
                console.log("Stream call cleanup error:", err.message)
              );

              // 3. Clean up Stream Chat Channel
              const channel = chatClient.channel("messaging", session.callId);
              await channel.delete().catch((err) => 
                console.log("Stream chat cleanup error:", err.message)
              );
            }
            console.log(`Session ${roomId} ended automatically.`);
          }
        } catch (error) {
          console.error("Error auto-ending session:", error.message);
        }
      }
    }
  });

  socket.on("toggle-code-space", async ({ roomId, isOpen }) => {
    try {
      // 1. Update the "Source of Truth"
      await Session.findByIdAndUpdate(roomId, { isCodeOpen: isOpen });

      // 2. Broadcast the new state to EVERYONE in the room (Host + Participant)
      // We use io.in() instead of socket.to() so the sender (Host) also receives the confirmation event 
      // if you want a single source of truth, or just update local state optimistically.
      // Here we broadcast to everyone so all clients stay in sync.
      io.in(roomId).emit("code-space-state", isOpen);
      
      console.log(`Room ${roomId} code space toggled to: ${isOpen}`);
    } catch (error) {
      console.error("Error toggling code space:", error);
    }
  });
  
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/chat", chatRoutes);
app.use("/api/sessions", sessionRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ msg: "api is up and running" });
});

// make our app ready for deployment
if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

const startServer = async () => {
  try {
    await connectDB();
    httpServer.listen(ENV.PORT, () => console.log("Server is running on port:", ENV.PORT));
  } catch (error) {
    console.error("💥 Error starting the server", error);
  }
};

startServer();
