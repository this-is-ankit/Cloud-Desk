import { chatClient, streamClient } from "../lib/stream.js";
import Session from "../models/Session.js";
import { whiteboardStateByRoom } from "../server.js";

export async function createSession(req, res) {
  try {
    const { language, sessionType = "one-on-one", maxParticipants } = req.body;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    if (!language) {
      return res.status(400).json({ message: "Language is required" });
    }

    let participantLimit;
    if (sessionType === "group") {
      const parsedMax = parseInt(maxParticipants);
      if (isNaN(parsedMax) || parsedMax < 2 || parsedMax > 20) {
        participantLimit = 10;
      } else {
        participantLimit = parsedMax;
      }
    } else {
      participantLimit = 1;
    }

    const callId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // GENERATE A RANDOM 6-CHARACTER CODE
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // SAVE THE CODE TO THE DB
    const session = await Session.create({
      language,
      host: userId,
      callId,
      code,
      sessionType,
      maxParticipants: participantLimit,
      participants: [], // Initialize empty array
    });

    await streamClient.video.call("default", callId).getOrCreate({
      data: {
        created_by_id: clerkId,
        custom: { language, sessionId: session._id.toString() },
      },
    });

    const channel = chatClient.channel("messaging", callId, {
      name: `${language.charAt(0).toUpperCase() + language.slice(1)} Session`,
      created_by_id: clerkId,
      members: [clerkId],
    });

    await channel.create();

    res.status(201).json({ session });
  } catch (error) {
    console.log("Error in createSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getActiveSessions(_, res) {
  try {
    const sessions = await Session.find({ status: "active" })
      .populate("host", "name profileImage email clerkId")
      .populate("participants", "name profileImage email clerkId")
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions });
  } catch (error) {
    console.log("Error in getActiveSessions controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyRecentSessions(req, res) {
  try {
    const userId = req.user._id;

    // get sessions where user is either host or participant
    const sessions = await Session.find({
      status: "completed",
      $or: [{ host: userId }, { participants: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions });
  } catch (error) {
    console.log("Error in getMyRecentSessions controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getSessionById(req, res) {
  try {
    const { id } = req.params;

    const session = await Session.findById(id)
      .populate("host", "name email profileImage clerkId")
      .populate("participants", "name email profileImage clerkId");

    if (!session) return res.status(404).json({ message: "Session not found" });

    res.status(200).json({ session });
  } catch (error) {
    console.log("Error in getSessionById controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function joinSession(req, res) {
  try {
    const { id } = req.params;
    const { code } = req.body;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });

    if (session.status !== "active") {
      return res
        .status(400)
        .json({ message: "Cannot join a completed session" });
    }

    // VERIFY THE CODE
    if (session.code !== code) {
      return res.status(400).json({ message: "Invalid access code" });
    }

    if (session.host.toString() === userId.toString()) {
      return res
        .status(400)
        .json({ message: "Host cannot join as a participant" });
    }

    const isAlreadyJoined = session.participants.some(
      (p) => p.toString() === userId.toString(),
    );

    if (isAlreadyJoined) {
      return res.status(200).json({ session });
    }

    if (session.participants.length >= session.maxParticipants) {
      console.log(`Join rejected: Room full. Current: ${session.participants.length}, Max: ${session.maxParticipants}`);
      return res.status(409).json({ message: "Session is full" });
    }

    session.participants.push(userId);
    await session.save();

    const channel = chatClient.channel("messaging", session.callId);
    await channel.addMembers([clerkId]);

    res.status(200).json({ session });
  } catch (error) {
    console.log("Error in joinSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function kickParticipant(req, res) {
  try {
    const { id } = req.params;
    const { participantId } = req.body;
    const userId = req.user._id;

    // Populate participant to get their Clerk ID fosession.participant = userId;r Stream removal
    const session = await Session.findById(id).populate("participants");

    if (!session) return res.status(404).json({ message: "Session not found" });

    if (session.host.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Only the host can kick a participant" });
    }

    const targetUser = session.participants.find(
      (p) => p._id.toString() === participantId,
    );
    if (!targetUser)
      return res
        .status(404)
        .json({ message: "Participant not found in session" });

    // Remove from Stream Channel (Chat/Video)
    if (targetUser.clerkId) {
      try {
        const channel = chatClient.channel("messaging", session.callId);
        await channel.removeMembers([targetUser.clerkId]);
      } catch (streamError) {
        console.log("Error removing from Stream:", streamError.message);
      }
    }

    // Remove from Database
    session.participants = session.participants.filter(
      (p) => p._id.toString() !== participantId,
    );
    await session.save();

    res
      .status(200)
      .json({ message: "Participant kicked successfully", session });
  } catch (error) {
    console.log("Error in kickParticipant controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function endSession(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });

    // check if user is the host
    if (session.host.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Only the host can end the session" });
    }

    // check if session is already completed
    if (session.status === "completed") {
      return res.status(400).json({ message: "Session is already completed" });
    }

    // delete stream video call
    const call = streamClient.video.call("default", session.callId);
    await call.delete({ hard: true });

    // delete stream chat channel
    const channel = chatClient.channel("messaging", session.callId);
    await channel.delete();

    session.status = "completed";
    await session.save();

    // ADD THIS LINE: Explicitly clear whiteboard state from memory
    whiteboardStateByRoom.delete(id);

    res.status(200).json({ session, message: "Session ended successfully" });
  } catch (error) {
    console.log("Error in endSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
