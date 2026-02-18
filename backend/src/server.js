import express from "express";
import path from "path";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { serve } from "inngest/express";
import { clerkMiddleware, verifyToken } from "@clerk/express";

import { ENV } from "./lib/env.js";
import { connectDB } from "./lib/db.js";
import { inngest, functions } from "./lib/inngest.js";

import chatRoutes from "./routes/chatRoutes.js";
import sessionRoutes from "./routes/sessionRoute.js";

import Session from "./models/Session.js";
import User from "./models/User.js";
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

export const whiteboardStateByRoom = new Map();
const WHITEBOARD_MAX_COORDINATE = 4000;
const WHITEBOARD_MAX_ELEMENTS = 2000;

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

const isSafePoint = (point) => {
  if (!Array.isArray(point) || point.length < 2) return false;
  const [x, y] = point;
  return (
    isFiniteNumber(x) &&
    isFiniteNumber(y) &&
    Math.abs(x) <= WHITEBOARD_MAX_COORDINATE &&
    Math.abs(y) <= WHITEBOARD_MAX_COORDINATE
  );
};

const sanitizeWhiteboardElement = (element) => {
  if (!element || typeof element !== "object") return null;

  const newElement = { ...element };

  // Sanitize x, y
  newElement.x = isFiniteNumber(element.x) ? element.x : 0;
  newElement.y = isFiniteNumber(element.y) ? element.y : 0;

  // Reject element if its base position is out of bounds
  if (Math.abs(newElement.x) > WHITEBOARD_MAX_COORDINATE || Math.abs(newElement.y) > WHITEBOARD_MAX_COORDINATE) {
    console.warn("Element position out of bounds, rejecting:", element);
    return null;
  }

  // Sanitize points array if present
  if (Array.isArray(element.points)) {
    newElement.points = element.points.filter(isSafePoint);
    if (newElement.points.length === 0 && element.type === "freedraw") {
        console.warn("Freedraw element with no safe points, rejecting:", element);
        return null; // Reject freedraw if it has no valid points
    }
  } else if (element.type === "freedraw") {
       console.warn("Freedraw element without a points array, rejecting:", element);
       return null; // Freedraw must have points
  }


  // Keep freedraw geometry untouched. Excalidraw stores points relative to the
  // element origin, so recomputing bounds here can break strokes.
  if (element.type === "freedraw") {
    if (!newElement.points || newElement.points.length === 0) {
      console.warn("Freedraw element with invalid or empty points array after sanitization, rejecting:", element);
      return null;
    }
    if (!isFiniteNumber(newElement.width)) newElement.width = 0;
    if (!isFiniteNumber(newElement.height)) newElement.height = 0;
  } else {
    // For other elements, ensure width/height are finite and not excessively large
    if (!isFiniteNumber(newElement.width)) newElement.width = 0;
    if (!isFiniteNumber(newElement.height)) newElement.height = 0;

    if (Math.abs(newElement.width) > WHITEBOARD_MAX_COORDINATE || Math.abs(newElement.height) > WHITEBOARD_MAX_COORDINATE) {
      console.warn("Element width/height out of bounds for non-freedraw type, rejecting:", element);
      return null;
    }
  }

  return newElement;
};

const sanitizeWhiteboardElements = (elements) => {
  if (!Array.isArray(elements)) return [];
  return elements
    .slice(0, WHITEBOARD_MAX_ELEMENTS)
    .map(sanitizeWhiteboardElement)
    .filter(Boolean);
};

const getElementVersion = (element) => {
  if (!element || typeof element !== "object") return 0;
  return Number.isFinite(element.version) ? element.version : 0;
};

const getElementUpdated = (element) => {
  if (!element || typeof element !== "object") return 0;
  return Number.isFinite(element.updated) ? element.updated : 0;
};

const isIncomingElementNewer = (incoming, current) => {
  const incomingVersion = getElementVersion(incoming);
  const currentVersion = getElementVersion(current);
  if (incomingVersion !== currentVersion) {
    return incomingVersion > currentVersion;
  }

  const incomingUpdated = getElementUpdated(incoming);
  const currentUpdated = getElementUpdated(current);
  if (incomingUpdated !== currentUpdated) {
    return incomingUpdated > currentUpdated;
  }

  return true;
};

const mergeWhiteboardElementsByVersion = (currentElements, incomingElements) => {
  const current = Array.isArray(currentElements) ? currentElements : [];
  const incoming = Array.isArray(incomingElements) ? incomingElements : [];

  const mergedById = new Map();
  for (const element of current) {
    if (element?.id) mergedById.set(element.id, element);
  }

  for (const incomingElement of incoming) {
    if (!incomingElement?.id) continue;

    const currentElement = mergedById.get(incomingElement.id);
    if (!currentElement || isIncomingElementNewer(incomingElement, currentElement)) {
      mergedById.set(incomingElement.id, incomingElement);
    }
  }

  const output = [];
  const seenIds = new Set();

  for (const element of incoming) {
    if (!element?.id || seenIds.has(element.id)) continue;
    const merged = mergedById.get(element.id);
    if (merged) {
      output.push(merged);
      seenIds.add(element.id);
    }
  }

  for (const element of current) {
    if (!element?.id || seenIds.has(element.id)) continue;
    const merged = mergedById.get(element.id);
    if (merged) {
      output.push(merged);
      seenIds.add(element.id);
    }
  }

  return output.slice(0, WHITEBOARD_MAX_ELEMENTS);
};

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: ENV.CLERK_SECRET_KEY,
    });

    if (!payload?.sub) {
      return next(new Error("Invalid token payload"));
    }

    socket.userId = payload.sub;
    socket.clerkId = payload.sub;
    next();
  } catch (error) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id, "Clerk ID:", socket.clerkId);

  socket.on("join-session", async (roomId) => {
    try {
      const session = await Session.findById(roomId); // Load session from DB

      if (!session) {
        socket.emit("error", { message: "Session not found" });
        return;
      }

      const currentUser = await User.findOne({ clerkId: socket.clerkId }).select("_id");
      if (!currentUser) {
        socket.emit("error", { message: "User not found" });
        return;
      }

      const mongoUserId = currentUser._id.toString();
      const isHost = session.host.toString() === mongoUserId;
      const isParticipant = session.participants.some((p) => p.toString() === mongoUserId);

      if (!isHost && !isParticipant) {
        socket.emit("error", { message: "Not authorized to join this session" });
        return;
      }

      socket.join(roomId);
      console.log(`User ${socket.id} (${socket.clerkId}) joined room: ${roomId}`);

      // Check in-memory cache first
      let roomWhiteboardState = whiteboardStateByRoom.get(roomId); 

      if (!roomWhiteboardState) {
        // If not in cache, load from DB
        roomWhiteboardState = {
          isOpen: session.whiteboardIsOpen,
          elements: session.whiteboardElements,
          appState: session.whiteboardAppState,
        };
        whiteboardStateByRoom.set(roomId, roomWhiteboardState); // Cache it
      }
      
      socket.emit("whiteboard-sync", roomWhiteboardState);
    } catch (error) {
      socket.emit("error", { message: "Failed to join session" });
    }
  });

  socket.on("join-session-guest", (roomId) => {
    socket.join(roomId);
    console.log(`Guest user ${socket.id} joined room: ${roomId}`);
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

  // 4. Whiteboard Sync (Add this)
  socket.on("whiteboard-change", async ({ roomId, elements, appState }) => { // Made async
    if (!roomId || !socket.rooms.has(roomId)) return;
    if (!Array.isArray(elements)) return;
    const sanitizedElements = sanitizeWhiteboardElements(elements);

    // Update in-memory cache
    const currentState = whiteboardStateByRoom.get(roomId) || { isOpen: false, elements: [], appState: {} }; // Ensure default structure
    const currentSanitizedElements = sanitizeWhiteboardElements(currentState.elements);
    const mergedElements = mergeWhiteboardElementsByVersion(currentSanitizedElements, sanitizedElements);
    whiteboardStateByRoom.set(roomId, {
      ...currentState,
      elements: mergedElements,
      appState: appState || {}, // Ensure default empty object
    });

    // Save to DB
    await Session.findByIdAndUpdate(roomId, { 
      whiteboardElements: mergedElements,
      whiteboardAppState: appState || {},
    });

    // Broadcast to everyone in the room (including the sender)
    io.in(roomId).emit("whiteboard-update", {
      elements: mergedElements,
      appState: appState || {},
      senderSocketId: socket.id,
    });
  });

  // 5. Toggle Whiteboard Visibility (Add this)
  socket.on("toggle-whiteboard", async ({ roomId, isOpen }) => {
    if (!roomId || !socket.rooms.has(roomId)) return;

    try {
      const session = await Session.findById(roomId).populate("host", "clerkId");
      if (!session?.host?.clerkId) return;
      if (session.host.clerkId !== socket.clerkId) return;

      const currentState = whiteboardStateByRoom.get(roomId) || { elements: null, appState: null };
      whiteboardStateByRoom.set(roomId, {
        ...currentState,
        isOpen: Boolean(isOpen),
      });

      // Save to DB
      await Session.findByIdAndUpdate(roomId, { whiteboardIsOpen: Boolean(isOpen) });

      io.in(roomId).emit("whiteboard-state", isOpen);
    } catch (error) {
      console.error("Error toggling whiteboard:", error.message);
    }
  });
  socket.on("disconnecting", async () => {
    const rooms = [...socket.rooms];

    for (const roomId of rooms) {
      if (roomId === socket.id) continue; //

      const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;

      // ADJUSTMENT: Only auto-end if the room is becoming completely empty (0 users left)
      // This prevents a group session from ending just because one participant leaves.
      if (roomSize <= 1) { 
        console.log(`Room ${roomId} is empty. Auto-ending session...`); //
        whiteboardStateByRoom.delete(roomId);
        try {
          const session = await Session.findById(roomId);
          
          if (session && session.status === "active") {
            session.status = "completed"; //
            await session.save(); //

            if (session.callId) {
              const call = streamClient.video.call("default", session.callId); //
              await call.delete({ hard: true }).catch((err) => 
                console.log("Stream call cleanup error:", err.message)
              ); //

              const channel = chatClient.channel("messaging", session.callId); //
              await channel.delete().catch((err) => 
                console.log("Stream chat cleanup error:", err.message)
              ); //
            }
          }
        } catch (error) {
          console.error("Error auto-ending session:", error.message); //
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

  socket.on("toggle-anti-cheat", async ({ roomId, isEnabled }) => {
    try {
      await Session.findByIdAndUpdate(roomId, { isAntiCheatEnabled: isEnabled });
      io.in(roomId).emit("anti-cheat-update", isEnabled);
    } catch (error) {
      console.error("Error toggling anti-cheat:", error);
    }
  });

  // 5. Handle Cheat Detection
  socket.on("cheat-detected", ({ roomId, userId, reason }) => {
    // Notify the host (or everyone, and let frontend filter)
    // We send to the room so the host receives it
    socket.to(roomId).emit("cheat-alert", { userId, reason });
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
