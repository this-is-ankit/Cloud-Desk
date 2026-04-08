import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import io from "socket.io-client";
import WhiteboardPanel from "../components/WhiteboardPanel";
import WhiteboardErrorBoundary from "../components/WhiteboardErrorBoundary";
import {
  useEndSession,
  useJoinSession,
  useSessionById,
  useKickParticipant,
  useStartLivestream,
  useStopLivestream,
} from "../hooks/useSessions";
import { executeCode } from "../lib/piston";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Loader2Icon, KeyIcon, ListChecksIcon, PencilOffIcon } from "../components/icons/ModernIcons";
import toast from "react-hot-toast";
import CodeEditorPanel from "../components/CodeEditorPanel";
import OutputPanel from "../components/OutputPanel";
import QuizPanel from "../components/QuizPanel";
import HostToolsPopover from "../components/HostToolsPopover";

import useStreamClient from "../hooks/useStreamClient";
import { StreamCall, StreamVideo } from "@stream-io/video-react-sdk";
import VideoCallUI from "../components/VideoCallUI";
import { useRuntimeAuth } from "../hooks/useRuntimeAuth";
import { getSessionLanguageLabel, normalizeSessionLanguage } from "../lib/sessionLanguage";

function SessionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, getToken, authMode, devAuth } = useRuntimeAuth();
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [accessCode, setAccessCode] = useState("");

  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [isAntiCheatEnabled, setIsAntiCheatEnabled] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [whiteboardScene, setWhiteboardScene] = useState(null);
  const [whiteboardWriteMode, setWhiteboardWriteMode] = useState("host-only");
  const [whiteboardWriterIds, setWhiteboardWriterIds] = useState([]);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [quizBank, setQuizBank] = useState([]);
  const [quizLeaderboard, setQuizLeaderboard] = useState([]);
  const [quizTop3, setQuizTop3] = useState([]);
  const [activeQuizRound, setActiveQuizRound] = useState(null);
  const [myQuizSubmission, setMyQuizSubmission] = useState(null);
  const [lastRoundResult, setLastRoundResult] = useState(null);
  const [livestreamState, setLivestreamState] = useState(null);
  const [livestreamChatMessages, setLivestreamChatMessages] = useState([]);
  const [livestreamChatDraft, setLivestreamChatDraft] = useState("");
  const [hostCodeSnapshot, setHostCodeSnapshot] = useState(null);
  const [hostWhiteboardSnapshot, setHostWhiteboardSnapshot] = useState(null);
  const [isCodeDirtyFromHost, setIsCodeDirtyFromHost] = useState(false);
  const [isWhiteboardDirtyFromHost, setIsWhiteboardDirtyFromHost] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [toolLayoutMode, setToolLayoutMode] = useState("tabs");

  const socketRef = useRef(null);
  const wasParticipantRef = useRef(false);
  const initializedSessionRef = useRef(null);
  const isCodeDirtyFromHostRef = useRef(false);
  const isWhiteboardDirtyFromHostRef = useRef(false);

  const {
    data: sessionData,
    isLoading: loadingSession,
    refetch,
  } = useSessionById(id);

  const joinSessionMutation = useJoinSession();
  const endSessionMutation = useEndSession();
  const startLivestreamMutation = useStartLivestream();
  const stopLivestreamMutation = useStopLivestream();
  const kickParticipantMutation = useKickParticipant();

  const session = sessionData?.session;
  const isLivestream = session?.sessionType === "livestream";
  const livestreamLive = Boolean(livestreamState?.isLive ?? session?.livestream?.isLive);
  const showToolWorkspace = Boolean(isLivestream && activeTool);

  // Calculate roles
  const isHost = session?.host?.clerkId === user?.id;
  const isParticipant = session?.participants?.some(
    (p) => p.clerkId === user?.id
  );
  const isLivestreamViewer = Boolean(isLivestream && !isHost && session?.courseAccess?.canJoinWithoutCode);
  const hasSessionAccess = Boolean(isHost || isParticipant || isLivestreamViewer);
  const currentMongoUserId = isHost
    ? session?.host?._id
    : session?.participants?.find((p) => p.clerkId === user?.id)?._id;
  const canWriteWhiteboard = Boolean(
    isHost ||
      whiteboardWriteMode === "all" ||
      (whiteboardWriteMode === "approved" &&
        currentMongoUserId &&
        whiteboardWriterIds.includes(currentMongoUserId))
  );

  // --- FIX: Live Reference for Host Status ---
  const isHostRef = useRef(isHost);
  const isParticipantRef = useRef(isParticipant);
  const hasSessionAccessRef = useRef(hasSessionAccess);

  // Keep the ref updated whenever isHost changes (e.g. after session loads)
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  useEffect(() => {
    isParticipantRef.current = isParticipant;
  }, [isParticipant]);

  useEffect(() => {
    hasSessionAccessRef.current = hasSessionAccess;
  }, [hasSessionAccess]);

  useEffect(() => {
    if (!session?.courseAccess?.canJoinWithoutCode) return;
    if (loadingSession || isHost || isParticipant || isLivestreamViewer || joinSessionMutation.isPending) return;

    joinSessionMutation.mutate(
      { id, code: "" },
      {
        onSuccess: refetch,
      },
    );
  }, [id, isHost, isParticipant, isLivestreamViewer, joinSessionMutation, loadingSession, refetch, session?.courseAccess?.canJoinWithoutCode]);

  const { call, channel, chatClient, streamClient } = useStreamClient(
    session,
    loadingSession,
    isHost,
    isParticipant,
    isLivestreamViewer
  );

  useEffect(() => {
    if (!isLivestream || !livestreamLive || !call) return;
    call.join().catch(() => {});
  }, [isLivestream, livestreamLive, call]);

  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [code, setCode] = useState("");

  const codePanelDefaultSize = isWhiteboardOpen ? 30 : 60;
  const whiteboardPanelDefaultSize = isCodeOpen ? 30 : 60;
  const videoPanelDefaultSize = isCodeOpen || isWhiteboardOpen ? 40 : 100;

  const panelGroupRef = useRef(null);

  useEffect(() => {
    isCodeDirtyFromHostRef.current = isCodeDirtyFromHost;
  }, [isCodeDirtyFromHost]);

  useEffect(() => {
    isWhiteboardDirtyFromHostRef.current = isWhiteboardDirtyFromHost;
  }, [isWhiteboardDirtyFromHost]);

  const applyWhiteboardPermissions = useCallback(({ writeMode, writerIds }) => {
    if (typeof writeMode === "string") {
      setWhiteboardWriteMode(writeMode);
    }
    if (Array.isArray(writerIds)) {
      setWhiteboardWriterIds(
        writerIds
          .map((id) =>
            typeof id === "string" ? id : id?._id?.toString?.() || id?.toString?.() || ""
          )
          .filter(Boolean)
      );
    }
  }, []);

  // New useEffect to reset layout when panel visibility changes
  /*
  useEffect(() => {
    if (panelGroupRef.current) {
      // Small delay to allow DOM updates to settle
      const timeoutId = setTimeout(() => {
        panelGroupRef.current.resetLayout();
        console.log("PanelGroup layout reset triggered.");
      }, 50); 
      return () => clearTimeout(timeoutId);
    }
  }, [isCodeOpen, isWhiteboardOpen]); // Trigger when these change
  */

  useEffect(() => {
    setWhiteboardScene(null);
    setWhiteboardWriteMode("host-only");
    setWhiteboardWriterIds([]);
    setQuizBank([]);
    setQuizLeaderboard([]);
    setQuizTop3([]);
    setActiveQuizRound(null);
    setMyQuizSubmission(null);
    setLastRoundResult(null);
    setIsQuizOpen(false);
    setLivestreamState(null);
    setLivestreamChatMessages([]);
    setLivestreamChatDraft("");
    setHostCodeSnapshot(null);
    setHostWhiteboardSnapshot(null);
    setIsCodeDirtyFromHost(false);
    setIsWhiteboardDirtyFromHost(false);
    setActiveTool(null);
    setToolLayoutMode("tabs");
    wasParticipantRef.current = false;
    initializedSessionRef.current = null;
  }, [id]);

  useEffect(() => {
    if (!id) return;

    let isActive = true;
    let socket = null;

    const connectSocket = async () => {
      const socketURL =
        import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

      if (!isActive) return;

      if (authMode === "dev") {
        socket = io(socketURL, {
          auth: { devAuth },
        });
      } else {
        const token = await getToken();
        if (!token || !isActive) return;
        socket = io(socketURL, {
          auth: { token },
        });
      }
      socketRef.current = socket;

      socket.on("error", (error) => {
        if (
          error?.message === "Not authorized to join this session" &&
          !hasSessionAccessRef.current
        ) {
          return;
        }
        console.error("Socket error:", error.message);
        toast.error(error.message);
      });

      socket.on("connect", () => {
        if (hasSessionAccessRef.current) {
          socket.emit("join-session", id);
        }
      });

      socket.on("code-update", (newCode) => {
        setCode((prevCode) => {
          if (prevCode !== newCode) return newCode;
          return prevCode;
        });
      });

      socket.on("language-update", (newLang) => {
        setSelectedLanguage(normalizeSessionLanguage(newLang));
      });

      socket.on("code-space-state", (isOpen) => {
        setIsCodeOpen(isOpen);
        if (isOpen) setActiveTool((current) => current || "code");
      });

      socket.on("whiteboard-state", (isOpen) => {
        setIsWhiteboardOpen(Boolean(isOpen));
        if (isOpen) setActiveTool((current) => current || "whiteboard");
      });

      socket.on("whiteboard-update", ({ elements, appState, senderSocketId }) => {
        if (senderSocketId && senderSocketId === socket.id) return;
        if (!Array.isArray(elements)) return;
        setWhiteboardScene({ elements, appState: appState || null });
      });

      socket.on("whiteboard-sync", ({ isOpen, elements, appState, writeMode, writerIds }) => {
        setIsWhiteboardOpen(Boolean(isOpen));
        applyWhiteboardPermissions({ writeMode, writerIds });
        if (!Array.isArray(elements)) return;
        setWhiteboardScene({ elements, appState: appState || null });
      });

      socket.on("whiteboard-permissions-updated", ({ writeMode, writerIds }) => {
        applyWhiteboardPermissions({ writeMode, writerIds });
      });

      socket.on("whiteboard-write-denied", ({ message }) => {
        toast.error(message || "You do not have write access to this whiteboard.");
      });

      socket.on("quiz-bank-loaded", ({ quizBank: nextBank }) => {
        setQuizBank(Array.isArray(nextBank) ? nextBank : []);
      });

      socket.on("quiz-round-sync", ({ quizBank: nextBank, leaderboard, top3, activeRound }) => {
        setQuizBank(Array.isArray(nextBank) ? nextBank : []);
        setQuizLeaderboard(Array.isArray(leaderboard) ? leaderboard : []);
        setQuizTop3(Array.isArray(top3) ? top3 : []);
        setActiveQuizRound(activeRound || null);
        setMyQuizSubmission(activeRound?.mySubmission || null);
      });

      socket.on("quiz-round-started", (roundData) => {
        setActiveQuizRound(roundData);
        setMyQuizSubmission(null);
        setLastRoundResult(null);
        setIsQuizOpen(true);
      });

      socket.on("quiz-answer-accepted", ({ selectedOptionIndex, submittedAt, responseMs }) => {
        setMyQuizSubmission({ selectedOptionIndex, submittedAt, responseMs });
      });

      socket.on("quiz-round-closed", (result) => {
        setLastRoundResult(result);
        setActiveQuizRound(null);
      });

      socket.on("quiz-leaderboard-updated", ({ leaderboard, top3 }) => {
        setQuizLeaderboard(Array.isArray(leaderboard) ? leaderboard : []);
        setQuizTop3(Array.isArray(top3) ? top3 : []);
        setIsQuizOpen(true);
      });

      socket.on("quiz-error", ({ message }) => {
        toast.error(message || "Quiz action failed");
      });

      socket.on("livestream-state", (nextState) => {
        setLivestreamState(nextState || null);
      });

      socket.on("livestream-chat-history", (messages) => {
        setLivestreamChatMessages(Array.isArray(messages) ? messages : []);
      });

      socket.on("livestream-chat-message", (message) => {
        setLivestreamChatMessages((current) => [...current.slice(-99), message]);
      });

      socket.on("livestream-chat-error", ({ message }) => {
        toast.error(message || "Chat message failed");
      });

      socket.on("livestream-error", ({ message }) => {
        toast.error(message || "Livestream action failed");
      });

      socket.on("host-code-sync", (snapshot) => {
        setHostCodeSnapshot(snapshot || null);
        if (isHostRef.current || !isCodeDirtyFromHostRef.current) {
          setSelectedLanguage(normalizeSessionLanguage(snapshot?.language));
          setCode(snapshot?.code || "");
          setIsCodeDirtyFromHost(false);
        } else {
          toast("Host code updated. Use Sync to reset your local copy.");
        }
      });

      socket.on("host-whiteboard-sync", (snapshot) => {
        setHostWhiteboardSnapshot(snapshot || null);
        if (isHostRef.current || !isWhiteboardDirtyFromHostRef.current) {
          setWhiteboardScene({
            elements: Array.isArray(snapshot?.elements) ? snapshot.elements : [],
            appState: snapshot?.appState || {},
          });
          setIsWhiteboardDirtyFromHost(false);
        } else {
          toast("Host whiteboard updated. Use Sync to reset your local copy.");
        }
      });

      socket.on("anti-cheat-update", (isEnabled) => {
        setIsAntiCheatEnabled(isEnabled);
        if (isEnabled) {
          toast("Anti-Cheat mode enabled by host.", { icon: "🛡️" });
        } else {
          toast("Anti-Cheat mode disabled.");
        }
      });

      socket.on("cheat-alert", ({ reason }) => {
        const amIHost = isHostRef.current;
        if (amIHost) {
          toast.error(
            `⚠️ Candidate Warning: ${
              reason === "tab-switch" ? "Switched Tab" : "Window Minimized/Blurred"
            }`
          );
        }
      });

    };

    connectSocket();

    return () => {
      isActive = false;
      if (socket) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [id, getToken, user?.id, applyWhiteboardPermissions, authMode, devAuth]);

  useEffect(() => {
    if (!id || !socketRef.current) return;
    if (!hasSessionAccess) return;
    socketRef.current.emit("join-session", id);
  }, [id, hasSessionAccess]);

  useEffect(() => {
    if (session?.isCodeOpen !== undefined) setIsCodeOpen(session.isCodeOpen);
    if (session?.isAntiCheatEnabled !== undefined)
      setIsAntiCheatEnabled(session.isAntiCheatEnabled);
    if (typeof session?.whiteboardWriteMode === "string") {
      setWhiteboardWriteMode(session.whiteboardWriteMode);
    }
    if (Array.isArray(session?.whiteboardWriters)) {
      setWhiteboardWriterIds(
        session.whiteboardWriters
          .map((id) =>
            typeof id === "string" ? id : id?._id?.toString?.() || id?.toString?.() || ""
          )
          .filter(Boolean)
      );
    }
    if (session?.isCodeOpen) setActiveTool((current) => current || "code");
    if (session?.whiteboardIsOpen) setActiveTool((current) => current || "whiteboard");
  }, [session]);

  // --- Candidate Detection Logic ---
  useEffect(() => {
    if (!isParticipant || !isAntiCheatEnabled || !user?.id) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (!socketRef.current) return;
        socketRef.current.emit("cheat-detected", {
          roomId: id,
          userId: user.id,
          reason: "tab-switch",
        });
        toast.error("⚠️ Warning: Tab switching is monitored!");
      }
    };

    const handleBlur = () => {
      if (!socketRef.current) return;
      socketRef.current.emit("cheat-detected", {
        roomId: id,
        userId: user.id,
        reason: "window-blur",
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isParticipant, isAntiCheatEnabled, id, user?.id]);

  const handleCodeChange = (newCode = "") => {
    setCode(newCode);
    if (isLivestream && !isHost) {
      setIsCodeDirtyFromHost(true);
      return;
    }
    if (!socketRef.current) return;
    socketRef.current.emit("code-change", { roomId: id, code: newCode });
  };

  const handleLanguageChangeWrapper = (e) => {
    const newLang = normalizeSessionLanguage(e.target.value);
    setSelectedLanguage(newLang);
    setOutput(null);
    if (isLivestream && !isHost) {
      setIsCodeDirtyFromHost(true);
      return;
    }
    if (!socketRef.current) return;
    socketRef.current.emit("language-change", {
      roomId: id,
      language: newLang,
    });
  };

  const syncCodeFromHost = () => {
    if (hostCodeSnapshot) {
      setSelectedLanguage(normalizeSessionLanguage(hostCodeSnapshot.language));
      setCode(hostCodeSnapshot.code || "");
      setIsCodeDirtyFromHost(false);
      return;
    }
    socketRef.current?.emit("viewer-code-sync-request", { roomId: id });
  };

  const syncWhiteboardFromHost = () => {
    if (hostWhiteboardSnapshot) {
      setWhiteboardScene({
        elements: Array.isArray(hostWhiteboardSnapshot.elements) ? hostWhiteboardSnapshot.elements : [],
        appState: hostWhiteboardSnapshot.appState || {},
      });
      setIsWhiteboardDirtyFromHost(false);
      return;
    }
    socketRef.current?.emit("viewer-whiteboard-sync-request", { roomId: id });
  };

  const handleLocalWhiteboardChange = useCallback(() => {
    if (isLivestream && !isHost) setIsWhiteboardDirtyFromHost(true);
  }, [isLivestream, isHost]);

  const handleSendLivestreamChat = (event) => {
    event.preventDefault();
    if (!livestreamChatDraft.trim() || !socketRef.current) return;
    socketRef.current.emit("livestream-chat-send", {
      roomId: id,
      message: livestreamChatDraft,
    });
    setLivestreamChatDraft("");
  };

  const handleStartLivestream = () => {
    if (socketRef.current) {
      socketRef.current.emit("livestream-start", { roomId: id });
      return;
    }
    startLivestreamMutation.mutate(id);
  };

  const handleStopLivestream = () => {
    if (socketRef.current) {
      socketRef.current.emit("livestream-stop", { roomId: id });
      return;
    }
    stopLivestreamMutation.mutate(id);
  };

  const toggleCodeSpace = () => {
    const newState = !isCodeOpen;
    setIsCodeOpen(newState);
    setActiveTool(newState ? "code" : isWhiteboardOpen ? "whiteboard" : null);
    if (!socketRef.current) return;
    socketRef.current.emit("toggle-code-space", {
      roomId: id,
      isOpen: newState,
    });
  };

  const toggleWhiteboard = () => {
    const newState = !isWhiteboardOpen;
    setIsWhiteboardOpen(newState);
    setActiveTool(newState ? "whiteboard" : isCodeOpen ? "code" : null);
    if (isHost && socketRef.current) {
      socketRef.current.emit("toggle-whiteboard", {
        roomId: id,
        isOpen: newState,
      });
    }
  };

  const toggleAntiCheat = () => {
    const newState = !isAntiCheatEnabled;
    setIsAntiCheatEnabled(newState);
    if (!socketRef.current) return;
    socketRef.current.emit("toggle-anti-cheat", {
      roomId: id,
      isEnabled: newState,
    });
  };

  const handleWhiteboardWriteModeChange = (event) => {
    const nextMode = event.target.value;
    setWhiteboardWriteMode(nextMode);
    if (!isHost || !socketRef.current) return;
    socketRef.current.emit("whiteboard-set-write-mode", {
      roomId: id,
      mode: nextMode,
    });
  };

  const handleToggleWriterAccess = (participantId, hasAccess) => {
    if (!isHost || !socketRef.current || !participantId) return;
    socketRef.current.emit(hasAccess ? "whiteboard-revoke-writer" : "whiteboard-grant-writer", {
      roomId: id,
      userId: participantId,
    });
  };

  const toggleQuizPanel = () => {
    setIsQuizOpen((prev) => !prev);
  };

  const handleUploadQuiz = (quizJson) => {
    if (!socketRef.current) return;
    if (!quizJson) {
      toast.error("Invalid JSON file");
      return;
    }
    socketRef.current.emit("quiz-upload", {
      roomId: id,
      quizJson,
    });
  };

  const handleAddManualQuestion = (question) => {
    if (!socketRef.current) return;
    socketRef.current.emit("quiz-add-question", {
      roomId: id,
      question,
    });
  };

  const handleStartQuizRound = (questionId) => {
    if (!socketRef.current || !questionId) return;
    socketRef.current.emit("quiz-start-round", {
      roomId: id,
      questionId,
    });
  };

  const handleEndQuizRound = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("quiz-end-round", {
      roomId: id,
    });
  };

  const handleSubmitQuizAnswer = (selectedOptionIndex) => {
    if (!socketRef.current || !activeQuizRound?.roundId) return;
    socketRef.current.emit("quiz-submit-answer", {
      roomId: id,
      roundId: activeQuizRound.roundId,
      selectedOptionIndex,
    });
  };

  useEffect(() => {
    if (isParticipant) {
      wasParticipantRef.current = true;
      return;
    }

    if (wasParticipantRef.current && !isHost) {
      navigate("/dashboard");
      toast.error("You have been kicked from the session.");
    }
  }, [isParticipant, isHost, navigate]);

  useEffect(() => {
    if (!session || loadingSession) return;
    if (session.status === "completed") navigate("/dashboard");
  }, [session, loadingSession, navigate]);

  useEffect(() => {
    if (!id || !session?.language) return;
    if (initializedSessionRef.current === id) return;

    initializedSessionRef.current = id;
    const normalizedLanguage = normalizeSessionLanguage(session.language);
    setSelectedLanguage(normalizedLanguage);
    setCode(`// Start coding in ${getSessionLanguageLabel(normalizedLanguage)}...`);
  }, [id, session?.language]);

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput(null);
    const result = await executeCode(selectedLanguage, code);
    setOutput(result);
    setIsRunning(false);
  };

  const handleEndSession = () => {
    if (confirm("Are you sure you want to end this session?")) {
      endSessionMutation.mutate(id, {
        onSuccess: () => navigate("/dashboard"),
      });
    }
  };

  const handleJoinSession = (e) => {
    e.preventDefault();
    if (!accessCode && !session?.courseAccess?.canJoinWithoutCode) return;
    joinSessionMutation.mutate(
      { id, code: accessCode || "" },
      { onSuccess: refetch }
    );
  };

  const handleKickParticipant = (participantId) => {
    if (confirm("Are you sure you want to kick this participant?")) {
      // Pass the specific ID to your mutation
      kickParticipantMutation.mutate({ sessionId: id, participantId });
    }
  };

  if (loadingSession) {
    return (
      <div className="h-screen bg-base-100 flex items-center justify-center">
        <Loader2Icon className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-screen bg-base-100 flex items-center justify-center">
        <p className="text-xl font-semibold">Session not found</p>
      </div>
    );
  }

  if (!hasSessionAccess) {
    if (session?.courseAccess?.canJoinWithoutCode && joinSessionMutation.isPending) {
      return (
        <div className="h-screen bg-base-100 flex items-center justify-center">
          <Loader2Icon className="size-10 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <div className="h-screen bg-base-200 flex flex-col">
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-[2rem] border border-base-content/10 bg-base-100 p-7 shadow-xl">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Live classroom</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-base-content">
                {session?.courseAccess?.canJoinWithoutCode ? "Joining class" : "Join Session"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-base-content/62">
                {session?.courseAccess?.canJoinWithoutCode
                  ? "You already have course access. Join the room when you are ready."
                  : "Enter the access code shared by the host to join the live classroom."}
              </p>
              {session?.courseAccess?.canJoinWithoutCode ? (
                <div className="mt-6 space-y-4">
                  <p className="text-sm text-base-content/70">
                    You are approved for <span className="font-semibold">{session.courseAccess.courseTitle}</span>. Entering the live class now.
                  </p>
                  <button type="button" className="btn btn-primary h-12 w-full rounded-xl" onClick={handleJoinSession}>
                    Join Live Class
                  </button>
                </div>
              ) : (
                <form onSubmit={handleJoinSession} className="mt-6 space-y-4">
                  <div className="form-control">
                    <div className="relative">
                      <KeyIcon className="absolute left-3 top-3 size-5 text-base-content/40" />
                      <input
                        type="text"
                        placeholder="Access Code"
                        className="input input-bordered h-12 w-full rounded-xl pl-10 font-mono uppercase"
                        value={accessCode}
                        onChange={(e) =>
                          setAccessCode(e.target.value.toUpperCase())
                        }
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary h-12 w-full rounded-xl">
                    Join Session
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-base-200 flex flex-col">
      <div className="flex-1 flex flex-col">
        <div className="border-b border-base-content/10 bg-base-100/85 px-6 py-4 backdrop-blur-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-base-content">
              {getSessionLanguageLabel(selectedLanguage)}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-base-content/60">
              <span>Host: {session?.host?.name}</span>
              <span>•</span>
              <span>
                Participants: {session?.participants?.length || 0} /{" "}
                {session?.maxParticipants}
              </span>
              {isHost && (
                <>
                  <span>•</span>
                  <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                    Code: {session.code}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={toggleQuizPanel}
              className={`btn btn-sm gap-2 rounded-xl ${isQuizOpen ? "btn-accent" : "btn-ghost"}`}
            >
              <ListChecksIcon className="w-4 h-4" />
              Quiz
            </button>

            {isLivestream && (
              <>
                {isHost && (
                  <>
                    <button type="button" className="btn btn-primary btn-sm rounded-xl" onClick={handleStartLivestream} disabled={livestreamLive}>
                      Go Live
                    </button>
                    <button type="button" className="btn btn-outline btn-sm rounded-xl" onClick={handleStopLivestream} disabled={!livestreamLive}>
                      Stop Live
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsCodeOpen(true);
                    setActiveTool("code");
                  }}
                  className={`btn btn-sm rounded-xl ${activeTool === "code" ? "btn-primary" : "btn-ghost"}`}
                >
                  Code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsWhiteboardOpen(true);
                    setActiveTool("whiteboard");
                  }}
                  className={`btn btn-sm rounded-xl ${activeTool === "whiteboard" ? "btn-primary" : "btn-ghost"}`}
                >
                  Whiteboard
                </button>
              </>
            )}

            {isHost && session?.status === "active" && (
              <HostToolsPopover
                session={session}
                isAntiCheatEnabled={isAntiCheatEnabled}
                isCodeOpen={isCodeOpen}
                isWhiteboardOpen={isWhiteboardOpen}
                whiteboardWriteMode={whiteboardWriteMode}
                whiteboardWriterIds={whiteboardWriterIds}
                onToggleAntiCheat={toggleAntiCheat}
                onToggleCodeSpace={toggleCodeSpace}
                onToggleWhiteboard={toggleWhiteboard}
                onWhiteboardWriteModeChange={handleWhiteboardWriteModeChange}
                onToggleWriterAccess={handleToggleWriterAccess}
                onToggleQuizPanel={toggleQuizPanel}
                onKickParticipant={handleKickParticipant}
                onEndSession={handleEndSession}
              />
            )}

            {isWhiteboardOpen && !canWriteWhiteboard && (
              <span className="badge badge-warning gap-1">
                <PencilOffIcon className="w-3 h-3" />
                View only
              </span>
            )}
          </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative p-2 md:p-4 bg-base-200">
          <div className="h-full w-full bg-base-100 rounded-3xl shadow-sm border border-base-content/5 overflow-hidden">
            {showToolWorkspace ? (
              <div className="relative h-full w-full overflow-hidden bg-base-200">
                <div className="absolute left-4 top-4 z-20 flex flex-wrap gap-2">
                  <button type="button" className={`btn btn-xs rounded-lg ${toolLayoutMode === "tabs" ? "btn-primary" : "btn-ghost"}`} onClick={() => setToolLayoutMode("tabs")}>
                    Tabs
                  </button>
                  <button type="button" className={`btn btn-xs rounded-lg ${toolLayoutMode === "split" ? "btn-primary" : "btn-ghost"}`} onClick={() => setToolLayoutMode("split")}>
                    Split
                  </button>
                  <button type="button" className={`btn btn-xs rounded-lg ${activeTool === "code" ? "btn-accent" : "btn-ghost"}`} onClick={() => setActiveTool("code")}>
                    Code
                  </button>
                  <button type="button" className={`btn btn-xs rounded-lg ${activeTool === "whiteboard" ? "btn-accent" : "btn-ghost"}`} onClick={() => setActiveTool("whiteboard")}>
                    Whiteboard
                  </button>
                </div>

                <div className={`h-full w-full gap-3 p-3 pt-16 ${toolLayoutMode === "split" ? "grid lg:grid-cols-2" : "block"}`}>
                  {(toolLayoutMode === "split" || activeTool === "code") && (
                    <div className="relative h-full overflow-hidden rounded-xl border border-base-content/10 bg-base-100">
                      {isLivestream && !isHost && isCodeDirtyFromHost && (
                        <button type="button" className="btn btn-primary btn-xs absolute right-3 top-3 z-20 rounded-lg" onClick={syncCodeFromHost}>
                          Sync code
                        </button>
                      )}
                      <PanelGroup direction="vertical">
                        <Panel defaultSize={70} minSize={30}>
                          <CodeEditorPanel
                            selectedLanguage={selectedLanguage}
                            code={code}
                            isRunning={isRunning}
                            onLanguageChange={handleLanguageChangeWrapper}
                            onCodeChange={handleCodeChange}
                            onRunCode={handleRunCode}
                          />
                        </Panel>
                        <PanelResizeHandle className="h-1.5 bg-base-200 hover:bg-primary/20 transition-colors cursor-row-resize z-10" />
                        <Panel defaultSize={30} minSize={15}>
                          <OutputPanel output={output} />
                        </Panel>
                      </PanelGroup>
                    </div>
                  )}

                  {(toolLayoutMode === "split" || activeTool === "whiteboard") && (
                    <div className="relative h-full overflow-hidden rounded-xl border border-base-content/10 bg-base-100">
                      {isLivestream && !isHost && isWhiteboardDirtyFromHost && (
                        <button type="button" className="btn btn-primary btn-xs absolute right-3 top-3 z-20 rounded-lg" onClick={syncWhiteboardFromHost}>
                          Sync whiteboard
                        </button>
                      )}
                      <WhiteboardErrorBoundary>
                        <WhiteboardPanel
                          roomId={id}
                          socket={socketRef.current}
                          userName={user?.fullName || "User"}
                          scene={whiteboardScene}
                          canWrite={canWriteWhiteboard}
                          allowLocalEdits={isLivestream && !isHost}
                          onLocalChange={handleLocalWhiteboardChange}
                        />
                      </WhiteboardErrorBoundary>
                    </div>
                  )}
                </div>

                <div className="absolute bottom-4 right-4 z-30 h-40 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-base-content/20 bg-base-300 shadow-2xl md:h-52 md:w-80">
                  {!streamClient || !call ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2Icon className="animate-spin size-8 text-primary" />
                    </div>
                  ) : (
                    <StreamVideo client={streamClient}>
                      <StreamCall call={call}>
                        <VideoCallUI
                          sessionType={session?.sessionType}
                          isHost={isHost}
                          isLive={livestreamLive}
                          compact
                        />
                      </StreamCall>
                    </StreamVideo>
                  )}
                </div>

                {isLivestream && (
                  <form onSubmit={handleSendLivestreamChat} className="absolute bottom-4 left-4 z-30 flex max-h-64 w-72 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-base-content/10 bg-base-100 shadow-xl">
                    <div className="border-b border-base-content/10 px-3 py-2 text-sm font-semibold">Chat</div>
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm">
                      {livestreamChatMessages.slice(-20).map((message) => (
                        <p key={message.id || `${message.createdAt}-${message.message}`} className="break-words">
                          <span className="font-semibold">{message.userName || "Viewer"}:</span> {message.message}
                        </p>
                      ))}
                    </div>
                    <div className="flex gap-2 border-t border-base-content/10 p-2">
                      <input className="input input-bordered input-sm min-w-0 flex-1 rounded-lg" value={livestreamChatDraft} onChange={(event) => setLivestreamChatDraft(event.target.value)} placeholder="Message" />
                      <button type="submit" className="btn btn-primary btn-sm rounded-lg">Send</button>
                    </div>
                  </form>
                )}

                <QuizPanel
                  isHost={isHost}
                  isOpen={isQuizOpen || Boolean(activeQuizRound)}
                  activeRound={activeQuizRound}
                  quizBank={quizBank}
                  leaderboard={quizLeaderboard}
                  top3={quizTop3}
                  mySubmission={myQuizSubmission}
                  roundResult={lastRoundResult}
                  onClose={() => setIsQuizOpen(false)}
                  onUploadQuiz={handleUploadQuiz}
                  onAddManualQuestion={handleAddManualQuestion}
                  onStartRound={handleStartQuizRound}
                  onEndRound={handleEndQuizRound}
                  onSubmitAnswer={handleSubmitQuizAnswer}
                />
              </div>
            ) : (
            <PanelGroup ref={panelGroupRef} direction="horizontal">
            {isCodeOpen && (
              <>
                {/* --- FIX: Added id and order --- */}
                <Panel id="code-panel" order={1} defaultSize={codePanelDefaultSize} minSize={20}>
                  <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-hidden">
                      <PanelGroup direction="vertical">
                        <Panel defaultSize={70} minSize={30}>
                          <CodeEditorPanel
                            selectedLanguage={selectedLanguage}
                            code={code}
                            isRunning={isRunning}
                            onLanguageChange={handleLanguageChangeWrapper}
                            onCodeChange={handleCodeChange}
                            onRunCode={handleRunCode}
                          />
                        </Panel>
                        <PanelResizeHandle className="h-1.5 bg-base-200 hover:bg-primary/20 transition-colors cursor-row-resize z-10" />
                        <Panel defaultSize={30} minSize={15}>
                          <OutputPanel output={output} />
                        </Panel>
                      </PanelGroup>
                    </div>
                  </div>
                </Panel>
                <PanelResizeHandle className="w-2 bg-base-300 hover:bg-primary transition-colors cursor-col-resize" />
              </>
            )}

            {/* NEW: Whiteboard Panel */}
            {isWhiteboardOpen && (
              <>
                <Panel id="whiteboard-panel" order={2} defaultSize={whiteboardPanelDefaultSize} minSize={20}>
                  <WhiteboardErrorBoundary>
                    <div className="h-full w-full relative">
                      <WhiteboardPanel
                        roomId={id}
                        socket={socketRef.current}
                        userName={user?.fullName || "User"}
                        scene={whiteboardScene}
                        canWrite={canWriteWhiteboard}
                        allowLocalEdits={isLivestream && !isHost}
                        onLocalChange={handleLocalWhiteboardChange}
                      />
                    </div>
                  </WhiteboardErrorBoundary>
                </Panel>
                <PanelResizeHandle className="w-2 bg-base-300 hover:bg-primary transition-colors cursor-col-resize" />
              </>
            )}

            {/* --- FIX: Added id and order --- */}
            <Panel
              id="video-panel"
              order={3}
              defaultSize={videoPanelDefaultSize}
              minSize={20}
            >
              <div className="h-full bg-base-200 p-4 overflow-auto relative">
                {!streamClient || !call ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2Icon className="animate-spin size-10 text-primary" />
                  </div>
                ) : (
                  <StreamVideo client={streamClient}>
                    <StreamCall call={call}>
                      <VideoCallUI
                        chatClient={chatClient}
                        channel={channel}
                        participants={session?.participants}
                        sessionType={session?.sessionType}
                        isHost={isHost}
                        isLive={livestreamLive}
                        onStartLivestream={handleStartLivestream}
                        onStopLivestream={handleStopLivestream}
                      />
                    </StreamCall>
                  </StreamVideo>
                )}

                {isLivestream && (
                  <form onSubmit={handleSendLivestreamChat} className="mt-4 flex max-h-72 flex-col overflow-hidden rounded-lg border border-base-content/10 bg-base-100">
                    <div className="border-b border-base-content/10 px-3 py-2 text-sm font-semibold">Live chat</div>
                    <div className="min-h-28 flex-1 space-y-2 overflow-y-auto p-3 text-sm">
                      {livestreamChatMessages.slice(-50).map((message) => (
                        <p key={message.id || `${message.createdAt}-${message.message}`} className="break-words">
                          <span className="font-semibold">{message.userName || "Viewer"}:</span> {message.message}
                        </p>
                      ))}
                    </div>
                    <div className="flex gap-2 border-t border-base-content/10 p-2">
                      <input className="input input-bordered input-sm min-w-0 flex-1 rounded-lg" value={livestreamChatDraft} onChange={(event) => setLivestreamChatDraft(event.target.value)} placeholder="Message" />
                      <button type="submit" className="btn btn-primary btn-sm rounded-lg">Send</button>
                    </div>
                  </form>
                )}

                <QuizPanel
                  isHost={isHost}
                  isOpen={isQuizOpen || Boolean(activeQuizRound)}
                  activeRound={activeQuizRound}
                  quizBank={quizBank}
                  leaderboard={quizLeaderboard}
                  top3={quizTop3}
                  mySubmission={myQuizSubmission}
                  roundResult={lastRoundResult}
                  onClose={() => setIsQuizOpen(false)}
                  onUploadQuiz={handleUploadQuiz}
                  onAddManualQuestion={handleAddManualQuestion}
                  onStartRound={handleStartQuizRound}
                  onEndRound={handleEndQuizRound}
                  onSubmitAnswer={handleSubmitQuizAnswer}
                />
              </div>
            </Panel>
          </PanelGroup>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionPage;
