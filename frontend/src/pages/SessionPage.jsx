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
import {
  CodeIcon,
  Loader2Icon,
  KeyIcon,
  ListChecksIcon,
  MessageSquareIcon,
  PencilOffIcon,
  PresentationIcon,
  UsersIcon,
  XIcon,
} from "../components/icons/ModernIcons";
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
import { Channel, Chat, MessageInput, MessageList, Thread, Window } from "stream-chat-react";

function EmptySidebarState({ children }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-base-content/60">
      {children}
    </div>
  );
}

function StreamChatPanel({ chatClient, channel }) {
  if (!chatClient || !channel) {
    return <EmptySidebarState>Chat is still loading.</EmptySidebarState>;
  }

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <Chat client={chatClient} theme="str-chat__theme-v2 str-chat__theme-light">
        <Channel channel={channel}>
          <Window>
            <MessageList />
            <MessageInput />
          </Window>
          <Thread />
        </Channel>
      </Chat>
    </div>
  );
}

function LivestreamChatPanel({ messages, draft, onDraftChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm">
        {messages.length ? (
          messages.slice(-100).map((message) => (
            <p key={message.id || `${message.createdAt}-${message.message}`} className="break-words">
              <span className="font-semibold">{message.userName || "Viewer"}:</span> {message.message}
            </p>
          ))
        ) : (
          <EmptySidebarState>No chat messages yet.</EmptySidebarState>
        )}
      </div>
      <div className="flex shrink-0 gap-2 border-t border-base-content/10 p-2">
        <input
          className="input input-bordered input-sm min-w-0 flex-1 rounded-lg"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Message"
        />
        <button type="submit" className="btn btn-primary btn-sm rounded-lg">
          Send
        </button>
      </div>
    </form>
  );
}

function ParticipantsPanel({ session, isHost, onKickParticipant }) {
  const participants = session?.participants || [];

  return (
    <div className="h-full min-h-0 overflow-y-auto p-3">
      <div className="mb-3 rounded-lg border border-primary/20 bg-primary/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Host</p>
        <p className="mt-1 font-semibold">{session?.host?.name || "Teacher"}</p>
      </div>

      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold">Participants</span>
        <span className="badge badge-ghost">{participants.length}</span>
      </div>

      {participants.length ? (
        <div className="space-y-2">
          {participants.map((participant) => (
            <div
              key={participant._id || participant.clerkId}
              className="flex items-center justify-between gap-3 rounded-lg border border-base-content/10 bg-base-200/60 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{participant.name || "Participant"}</p>
                {participant.email && <p className="truncate text-xs text-base-content/55">{participant.email}</p>}
              </div>
              {isHost && participant._id && (
                <button type="button" className="btn btn-error btn-xs rounded-lg" onClick={() => onKickParticipant(participant._id)}>
                  Kick
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptySidebarState>No participants have joined yet.</EmptySidebarState>
      )}
    </div>
  );
}

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
  const [isCodeDirtyFromHost, setIsCodeDirtyFromHost] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState("chat");

  const socketRef = useRef(null);
  const wasParticipantRef = useRef(false);
  const initializedSessionRef = useRef(null);
  const isCodeDirtyFromHostRef = useRef(false);
  const livestreamJoinedCallIdRef = useRef(null);
  const activeToolRef = useRef(activeTool);
  const pendingHostWhiteboardSnapshotRef = useRef(null);

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
  const layoutMode = activeTool ? "tool-pip" : "video";

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
    if (!isLivestream || !livestreamLive) {
      livestreamJoinedCallIdRef.current = null;
      return;
    }
    if (!call || livestreamJoinedCallIdRef.current === call.id) return;

    livestreamJoinedCallIdRef.current = call.id;
    call
      .join()
      .then(() => {
        refetch();
      })
      .catch((error) => {
        livestreamJoinedCallIdRef.current = null;
        console.error("Error joining live stream:", error);
      });
  }, [isLivestream, livestreamLive, call, refetch]);

  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [code, setCode] = useState("");

  useEffect(() => {
    isCodeDirtyFromHostRef.current = isCodeDirtyFromHost;
  }, [isCodeDirtyFromHost]);

  useEffect(() => {
    activeToolRef.current = activeTool;
    if (activeTool !== "whiteboard" && pendingHostWhiteboardSnapshotRef.current) {
      setWhiteboardScene(pendingHostWhiteboardSnapshotRef.current);
      pendingHostWhiteboardSnapshotRef.current = null;
    }
  }, [activeTool]);

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
    setIsCodeDirtyFromHost(false);
    setActiveTool(null);
    setSidebarOpen(true);
    setActiveSidebarTab("chat");
    wasParticipantRef.current = false;
    initializedSessionRef.current = null;
    pendingHostWhiteboardSnapshotRef.current = null;
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
        if (activeRound) {
          setIsQuizOpen(true);
          setSidebarOpen(true);
          setActiveSidebarTab("quiz");
        }
      });

      socket.on("quiz-round-started", (roundData) => {
        setActiveQuizRound(roundData);
        setMyQuizSubmission(null);
        setLastRoundResult(null);
        setIsQuizOpen(true);
        setSidebarOpen(true);
        setActiveSidebarTab("quiz");
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
        setSidebarOpen(true);
        setActiveSidebarTab("quiz");
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
        }
      });

      socket.on("host-whiteboard-sync", (snapshot) => {
        const nextScene = {
          elements: Array.isArray(snapshot?.elements) ? snapshot.elements : [],
          appState: snapshot?.appState || {},
        };

        if (isHostRef.current && activeToolRef.current === "whiteboard") {
          pendingHostWhiteboardSnapshotRef.current = nextScene;
          return;
        }

        setWhiteboardScene(nextScene);
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

  const handleSendLivestreamChat = (event) => {
    event.preventDefault();
    if (!livestreamChatDraft.trim() || !socketRef.current) return;
    socketRef.current.emit("livestream-chat-send", {
      roomId: id,
      message: livestreamChatDraft,
    });
    setLivestreamChatDraft("");
  };

  const handleStartLivestream = async () => {
    if (!call) {
      toast.error("Video is still loading. Try again in a moment.");
      return;
    }

    try {
      await call.join();
    } catch (error) {
      const message = error?.message || "";
      if (!message.toLowerCase().includes("already")) {
        console.error("Error joining livestream before start:", error);
      }
    }

    try {
      await Promise.all([call.camera.enable(), call.microphone.enable()]);
    } catch (error) {
      console.error("Error enabling livestream media:", error);
      toast.error("Allow camera and microphone access before going live.");
      return;
    }

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
    const shouldOpen = !(activeSidebarTab === "quiz" && sidebarOpen && isQuizOpen && !activeQuizRound);
    setActiveSidebarTab("quiz");
    setSidebarOpen(shouldOpen || Boolean(activeQuizRound));
    setIsQuizOpen(shouldOpen || Boolean(activeQuizRound));
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

  useEffect(() => {
    if (activeTool === "code" && !isCodeOpen) {
      setActiveTool(isWhiteboardOpen ? "whiteboard" : null);
    } else if (activeTool === "whiteboard" && !isWhiteboardOpen) {
      setActiveTool(isCodeOpen ? "code" : null);
    }
  }, [activeTool, isCodeOpen, isWhiteboardOpen]);

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

  const availableStageTools = [
    isCodeOpen ? { id: "code", label: "Code", icon: CodeIcon } : null,
    isWhiteboardOpen ? { id: "whiteboard", label: "Whiteboard", icon: PresentationIcon } : null,
  ].filter(Boolean);

  const openSidebarTab = (tab) => {
    setActiveSidebarTab(tab);
    setSidebarOpen(true);
    if (tab === "quiz") setIsQuizOpen(true);
  };

  const closeQuizSidebar = () => {
    if (activeQuizRound) return;
    setIsQuizOpen(false);
    setActiveSidebarTab("chat");
  };

  const renderCall = ({ compact = false } = {}) => {
    if (!streamClient || !call) {
      return (
        <div className="h-full flex items-center justify-center">
          <Loader2Icon className={`animate-spin text-primary ${compact ? "size-8" : "size-10"}`} />
        </div>
      );
    }

    return (
      <StreamVideo client={streamClient}>
        <StreamCall call={call}>
          <VideoCallUI
            sessionType={session?.sessionType}
            isHost={isHost}
            isLive={livestreamLive}
            onStartLivestream={handleStartLivestream}
            onStopLivestream={handleStopLivestream}
            compact={compact}
            showHeader={!compact && isLivestream}
            showControls={!compact && !isLivestream}
            showLivestreamActions={false}
            onLeave={() => navigate("/dashboard")}
          />
        </StreamCall>
      </StreamVideo>
    );
  };

  const renderCodeStage = () => (
    <div className="relative h-full min-h-0 overflow-hidden rounded-xl border border-base-content/10 bg-base-100">
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
  );

  const renderWhiteboardStage = () => (
    <div className="relative h-full min-h-0 overflow-hidden rounded-xl border border-base-content/10 bg-base-100">
      <WhiteboardErrorBoundary>
        <WhiteboardPanel
          roomId={id}
          socket={socketRef.current}
          userName={user?.fullName || user?.firstName || "User"}
          scene={whiteboardScene}
          canWrite={canWriteWhiteboard}
        />
      </WhiteboardErrorBoundary>
    </div>
  );

  const renderMainStage = () => {
    if (layoutMode === "video") {
      return <div className="h-full min-h-0 overflow-hidden rounded-xl bg-base-300">{renderCall()}</div>;
    }

    return (
      <div className="relative h-full min-h-0 overflow-hidden bg-base-200 p-3 pt-16">
        <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-2 rounded-xl border border-base-content/10 bg-base-100/90 p-2 shadow backdrop-blur">
          {availableStageTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                className={`btn btn-xs gap-2 rounded-lg ${activeTool === tool.id ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setActiveTool(tool.id)}
              >
                <Icon className="size-4" />
                {tool.label}
              </button>
            );
          })}
        </div>

        <div className="h-full min-h-0">
          {activeTool === "code" ? renderCodeStage() : renderWhiteboardStage()}
        </div>

        <div className="absolute bottom-3 right-3 z-30 h-28 w-44 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-base-content/20 bg-base-300 shadow-2xl transition-all duration-300 ease-out md:bottom-4 md:right-4 md:h-48 md:w-72">
          {renderCall({ compact: true })}
        </div>
      </div>
    );
  };

  const renderSidebarContent = () => {
    if (activeSidebarTab === "participants") {
      return <ParticipantsPanel session={session} isHost={isHost} onKickParticipant={handleKickParticipant} />;
    }

    if (activeSidebarTab === "quiz") {
      return (
        <QuizPanel
          isHost={isHost}
          isOpen={isQuizOpen || Boolean(activeQuizRound)}
          variant="sidebar"
          activeRound={activeQuizRound}
          quizBank={quizBank}
          leaderboard={quizLeaderboard}
          top3={quizTop3}
          mySubmission={myQuizSubmission}
          roundResult={lastRoundResult}
          onClose={closeQuizSidebar}
          onUploadQuiz={handleUploadQuiz}
          onAddManualQuestion={handleAddManualQuestion}
          onStartRound={handleStartQuizRound}
          onEndRound={handleEndQuizRound}
          onSubmitAnswer={handleSubmitQuizAnswer}
        />
      );
    }

    return isLivestream ? (
      <LivestreamChatPanel
        messages={livestreamChatMessages}
        draft={livestreamChatDraft}
        onDraftChange={setLivestreamChatDraft}
        onSubmit={handleSendLivestreamChat}
      />
    ) : (
      <StreamChatPanel chatClient={chatClient} channel={channel} />
    );
  };

  const sidebarTabs = [
    { id: "chat", label: "Chat", icon: MessageSquareIcon },
    { id: "participants", label: "People", icon: UsersIcon },
    { id: "quiz", label: "Quiz", icon: ListChecksIcon },
  ];

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
    <div className="h-dvh overflow-hidden bg-base-200 text-base-content flex flex-col">
      <div className="shrink-0 border-b border-base-content/10 bg-base-100/90 px-3 py-2 backdrop-blur-sm md:px-5">
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-base-content md:text-xl">
              {getSessionLanguageLabel(selectedLanguage)}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-base-content/60 md:text-sm">
              <span>Host: {session?.host?.name}</span>
              <span>•</span>
              <span>
                Participants: {session?.participants?.length || 0} / {session?.maxParticipants}
              </span>
              {isLivestream && (
                <>
                  <span>•</span>
                  <span className={livestreamLive ? "text-success" : "text-base-content/60"}>
                    {livestreamLive ? "Live now" : isHost ? "Backstage" : "Waiting for host"}
                  </span>
                </>
              )}
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

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => openSidebarTab("chat")}
              className={`btn btn-sm gap-2 rounded-xl ${sidebarOpen && activeSidebarTab === "chat" ? "btn-primary" : "btn-ghost"}`}
            >
              <MessageSquareIcon className="size-4" />
              Chat
            </button>
            <button
              type="button"
              onClick={() => openSidebarTab("participants")}
              className={`btn btn-sm gap-2 rounded-xl ${sidebarOpen && activeSidebarTab === "participants" ? "btn-primary" : "btn-ghost"}`}
            >
              <UsersIcon className="size-4" />
              People
            </button>
            <button
              type="button"
              onClick={toggleQuizPanel}
              className={`btn btn-sm gap-2 rounded-xl ${isQuizOpen || activeSidebarTab === "quiz" ? "btn-accent" : "btn-ghost"}`}
            >
              <ListChecksIcon className="size-4" />
              Quiz
            </button>

            {isLivestream && isHost && (
              <>
                <button type="button" className="btn btn-primary btn-sm rounded-xl" onClick={handleStartLivestream} disabled={livestreamLive}>
                  Go Live
                </button>
                <button type="button" className="btn btn-outline btn-sm rounded-xl" onClick={handleStopLivestream} disabled={!livestreamLive}>
                  Stop Live
                </button>
              </>
            )}

            {availableStageTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
                  className={`btn btn-sm gap-2 rounded-xl ${activeTool === tool.id ? "btn-primary" : "btn-ghost"}`}
                >
                  <Icon className="size-4" />
                  {tool.label}
                </button>
              );
            })}

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

            {isLivestream && (
              <button type="button" className="btn btn-ghost btn-sm rounded-xl" onClick={() => navigate("/dashboard")}>
                Leave
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        className={`grid min-h-0 flex-1 gap-3 p-2 transition-[grid-template-columns] duration-300 ease-out md:p-3 ${
          sidebarOpen ? "lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]" : "lg:grid-cols-[minmax(0,1fr)_0rem]"
        }`}
      >
        <main className="relative min-h-0 overflow-hidden rounded-2xl border border-base-content/10 bg-base-100 shadow-sm">
          {renderMainStage()}
        </main>

        <aside
          className={`hidden min-h-0 overflow-hidden rounded-2xl border border-base-content/10 bg-base-100 shadow-sm transition-[opacity,width] duration-300 ease-out lg:block ${
            sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex shrink-0 items-center gap-2 border-b border-base-content/10 p-2">
              <div className="grid min-w-0 flex-1 grid-cols-3 gap-1">
                {sidebarTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={`btn btn-sm gap-2 rounded-lg ${activeSidebarTab === tab.id ? "btn-primary" : "btn-ghost"}`}
                      onClick={() => openSidebarTab(tab.id)}
                    >
                      <Icon className="size-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <button type="button" className="btn btn-ghost btn-sm btn-square rounded-lg" onClick={() => setSidebarOpen(false)}>
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">{renderSidebarContent()}</div>
          </div>
        </aside>
      </div>

      <div
        className={`fixed inset-y-0 right-0 z-50 w-[min(24rem,100vw)] border-l border-base-content/10 bg-base-100 shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-base-content/10 p-3">
            <div className="grid flex-1 grid-cols-3 gap-1">
              {sidebarTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`btn btn-xs gap-1 rounded-lg ${activeSidebarTab === tab.id ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => openSidebarTab(tab.id)}
                  >
                    <Icon className="size-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <button type="button" className="btn btn-ghost btn-sm btn-square ml-2 rounded-lg" onClick={() => setSidebarOpen(false)}>
              <XIcon className="size-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">{renderSidebarContent()}</div>
        </div>
      </div>
    </div>
  );
}

export default SessionPage;
