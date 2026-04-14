import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  DoorOpenIcon,
  Loader2Icon,
  KeyIcon,
  LaptopIcon,
  ListChecksIcon,
  LogOutIcon,
  MenuIcon,
  MessageSquareIcon,
  PencilOffIcon,
  PresentationIcon,
  SendIcon,
  UserMinusIcon,
  UsersIcon,
  XIcon,
  CpuIcon,
} from "../components/icons/ModernIcons";
import toast from "react-hot-toast";
import QuizPanel from "../components/QuizPanel";
import CircuitSimulatorPanel from "../components/CircuitSimulatorPanel";
import HostToolsPopover from "../components/HostToolsPopover";
import WorkspacePanel from "../components/WorkspacePanel";

import useStreamClient from "../hooks/useStreamClient";
import { StreamCall, StreamVideo } from "@stream-io/video-react-sdk";
import VideoCallUI from "../components/VideoCallUI";
import { useRuntimeAuth } from "../hooks/useRuntimeAuth";
import { getSessionLanguageLabel } from "../lib/sessionLanguage";
import {
  Channel,
  Chat,
  MessageInput,
  MessageList,
  Thread,
  Window,
} from "stream-chat-react";
import { useMyWorkspace } from "../hooks/useWorkspaces";

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
      <Chat
        client={chatClient}
        theme="str-chat__theme-v2 str-chat__theme-light"
      >
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
            <p
              key={message.id || `${message.createdAt}-${message.message}`}
              className="break-words"
            >
              <span className="font-semibold">
                {message.userName || "Viewer"}:
              </span>{" "}
              {message.message}
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
        <button
          type="submit"
          className="btn btn-primary btn-sm btn-square rounded-lg"
          aria-label="Send message"
          title="Send"
        >
          <SendIcon className="size-4" />
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
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Host
        </p>
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
                <p className="truncate text-sm font-semibold">
                  {participant.name || "Participant"}
                </p>
                {participant.email && (
                  <p className="truncate text-xs text-base-content/55">
                    {participant.email}
                  </p>
                )}
              </div>
              {isHost && participant._id && (
                <button
                  type="button"
                  className="btn btn-error btn-xs gap-1 rounded-lg"
                  onClick={() => onKickParticipant(participant._id)}
                >
                  <UserMinusIcon className="size-3.5" />
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
  const queryClient = useQueryClient();
  const { user, getToken, authMode, devAuth } = useRuntimeAuth();
  const [accessCode, setAccessCode] = useState("");

  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [isAntiCheatEnabled, setIsAntiCheatEnabled] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [isCircuitOpen, setIsCircuitOpen] = useState(false);
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
  const [activeTool, setActiveTool] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState("chat");
  const [isSessionMenuOpen, setIsSessionMenuOpen] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const socketRef = useRef(null);
  const sessionMenuRef = useRef(null);
  const wasParticipantRef = useRef(false);
  const activeToolRef = useRef(activeTool);
  const pendingHostWhiteboardSnapshotRef = useRef(null);
  const isInitialLoadRef = useRef(true);

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
  const layoutMode = activeTool ? "tool-pip" : "video";

  // Calculate roles
  const isHost = session?.host?.clerkId === user?.id;
  const isParticipant = session?.participants?.some(
    (p) => p.clerkId === user?.id,
  );
  const isLivestreamViewer = Boolean(
    isLivestream && !isHost && session?.courseAccess?.canJoinWithoutCode,
  );
  const hasSessionAccess = Boolean(
    isHost || isParticipant || isLivestreamViewer,
  );
  const workspaceQuery = useMyWorkspace(id, {
    enabled: hasSessionAccess,
    refetchInterval: 4000,
  });
  const workspace = workspaceQuery.data?.workspace || null;
  const workspaceLessonState = workspaceQuery.data?.lessonState || null;
  const refetchWorkspace = workspaceQuery.refetch;
  const currentMongoUserId = isHost
    ? session?.host?._id
    : session?.participants?.find((p) => p.clerkId === user?.id)?._id;
  const canWriteWhiteboard = Boolean(
    isHost ||
    whiteboardWriteMode === "all" ||
    (whiteboardWriteMode === "approved" &&
      currentMongoUserId &&
      whiteboardWriterIds.includes(currentMongoUserId)),
  );

  // --- FIX: Live Reference for Host Status ---
  const isHostRef = useRef(isHost);

  // Keep the ref updated whenever isHost changes (e.g. after session loads)
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  useEffect(() => {
    if (!session?.courseAccess?.canJoinWithoutCode) return;
    if (
      loadingSession ||
      isHost ||
      isParticipant ||
      isLivestreamViewer ||
      joinSessionMutation.isPending
    )
      return;

    joinSessionMutation.mutate(
      { id, code: "" },
      {
        onSuccess: refetch,
      },
    );
  }, [
    id,
    isHost,
    isParticipant,
    isLivestreamViewer,
    joinSessionMutation,
    loadingSession,
    refetch,
    session?.courseAccess?.canJoinWithoutCode,
  ]);

  const { call, channel, chatClient, streamClient } = useStreamClient(
    session,
    loadingSession,
    isHost,
    isParticipant,
    isLivestreamViewer,
  );

  useEffect(() => {
    activeToolRef.current = activeTool;
    if (
      activeTool !== "whiteboard" &&
      pendingHostWhiteboardSnapshotRef.current
    ) {
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
            typeof id === "string"
              ? id
              : id?._id?.toString?.() || id?.toString?.() || "",
          )
          .filter(Boolean),
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
    setActiveTool(null);
    setSidebarOpen(true);
    setActiveSidebarTab("chat");
    setIsSessionMenuOpen(false);
    wasParticipantRef.current = false;
    pendingHostWhiteboardSnapshotRef.current = null;
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sessionMenuRef.current &&
        !sessionMenuRef.current.contains(event.target)
      ) {
        setIsSessionMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        // Ignore "Not authorized" errors during initial handshake or if access is pending
        if (error?.message?.includes("authorized") || error?.message?.includes("Authentication")) {
          console.warn("Socket auth warning (ignoring and retrying in 2s):", error.message);
          setTimeout(() => {
            if (socketRef.current?.connected && hasSessionAccess) {
              socketRef.current.emit("join-session", id);
            }
          }, 2000);
          return;
        }
        console.error("Socket error:", error.message);
        toast.error(error.message);
      });

      socket.on("connect", () => {
        setIsSocketConnected(true);
        if (hasSessionAccess) {
          socket.emit("join-session", id);
        }
      });

      socket.on("disconnect", () => {
        setIsSocketConnected(false);
      });

      socket.on("workspace-stage-state", ({ isOpen }) => {
        const nextState = Boolean(isOpen);
        setIsWorkspaceOpen(nextState);
        if (nextState) setActiveTool("workspace");
      });

      socket.on("whiteboard-state", (isOpen) => {
        setIsWhiteboardOpen(Boolean(isOpen));
        if (isOpen) setActiveTool("whiteboard");
      });

      socket.on("toggle-circuit", ({ isOpen }) => {
        setIsCircuitOpen(Boolean(isOpen));
        if (isOpen) setActiveTool("circuit");
      });

      socket.on(
        "whiteboard-update",
        ({ elements, appState, senderSocketId }) => {
          if (senderSocketId && senderSocketId === socket.id) return;
          if (!Array.isArray(elements)) return;
          setWhiteboardScene({ elements, appState: appState || null });
        },
      );

      socket.on(
        "whiteboard-sync",
        ({ isOpen, elements, appState, writeMode, writerIds }) => {
          const isActuallyOpen = Boolean(isOpen);
          setIsWhiteboardOpen(isActuallyOpen);
          if (isActuallyOpen) setActiveTool("whiteboard");
          applyWhiteboardPermissions({ writeMode, writerIds });
          if (!Array.isArray(elements)) return;
          setWhiteboardScene({ elements, appState: appState || null });
        },
      );

      socket.on(
        "whiteboard-permissions-updated",
        ({ writeMode, writerIds }) => {
          applyWhiteboardPermissions({ writeMode, writerIds });
        },
      );

      socket.on("room/circuit/sync", ({ isOpen }) => {
        const isActuallyOpen = Boolean(isOpen);
        setIsCircuitOpen(isActuallyOpen);
        if (isActuallyOpen) setActiveTool("circuit");
      });

      socket.on("whiteboard-write-denied", ({ message }) => {
        toast.error(
          message || "You do not have write access to this whiteboard.",
        );
      });

      socket.on("quiz-bank-loaded", ({ quizBank: nextBank }) => {
        setQuizBank(Array.isArray(nextBank) ? nextBank : []);
      });

      socket.on(
        "quiz-round-sync",
        ({ quizBank: nextBank, leaderboard, top3, activeRound }) => {
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
        },
      );

      socket.on("quiz-round-started", (roundData) => {
        setActiveQuizRound(roundData);
        setMyQuizSubmission(null);
        setLastRoundResult(null);
        setIsQuizOpen(true);
        setSidebarOpen(true);
        setActiveSidebarTab("quiz");
      });

      socket.on(
        "quiz-answer-accepted",
        ({ selectedOptionIndex, submittedAt, responseMs }) => {
          setMyQuizSubmission({ selectedOptionIndex, submittedAt, responseMs });
        },
      );

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
        setLivestreamChatMessages((current) => [
          ...current.slice(-99),
          message,
        ]);
      });

      socket.on("livestream-chat-error", ({ message }) => {
        toast.error(message || "Chat message failed");
      });

      socket.on("livestream-error", ({ message }) => {
        toast.error(message || "Livestream action failed");
      });

      socket.on("language-update", () => {
        refetch();
      });

      const refetchWorkspaceState = () => {
        // Invalidate both participant's own workspace and the teacher's roster view
        queryClient.invalidateQueries({ queryKey: ["workspace", id] });
        queryClient.invalidateQueries({ queryKey: ["workspace-roster", id] });
      };

      socket.on("lesson-version-published", refetchWorkspaceState);
      socket.on("workspace-generation-updated", refetchWorkspaceState);
      socket.on("workspace-follow-state-changed", refetchWorkspaceState);
      socket.on("workspace-resynced", refetchWorkspaceState);
      socket.on("lesson-force-resynced", refetchWorkspaceState);
      socket.on("lesson-force-detached", refetchWorkspaceState);
      socket.on("workspace-roster-updated", refetchWorkspaceState);

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
              reason === "tab-switch"
                ? "Switched Tab"
                : "Window Minimized/Blurred"
            }`,
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
  }, [
    id,
    getToken,
    user?.id,
    applyWhiteboardPermissions,
    authMode,
    devAuth,
    hasSessionAccess,
    refetchWorkspace,
  ]);

  useEffect(() => {
    if (!id || !socketRef.current) return;
    if (!hasSessionAccess) return;
    socketRef.current.emit("join-session", id);
  }, [id, hasSessionAccess]);

  useEffect(() => {
    if (!session) return;

    if (session.isWorkspaceOpen !== undefined)
      setIsWorkspaceOpen(session.isWorkspaceOpen);
    if (session.isAntiCheatEnabled !== undefined)
      setIsAntiCheatEnabled(session.isAntiCheatEnabled);
    if (typeof session.whiteboardWriteMode === "string") {
      setWhiteboardWriteMode(session.whiteboardWriteMode);
    }
    if (Array.isArray(session.whiteboardWriters)) {
      setWhiteboardWriterIds(
        session.whiteboardWriters
          .map((id) =>
            typeof id === "string"
              ? id
              : id?._id?.toString?.() || id?.toString?.() || "",
          )
          .filter(Boolean),
      );
    }

    // Only auto-set activeTool on initial load from DB
    // Subsequent changes should come from Socket.IO events for real-time responsiveness
    if (isInitialLoadRef.current) {
      if (session.isWorkspaceOpen !== false) setActiveTool("workspace");
      if (session.isCircuitOpen) setActiveTool("circuit");
      if (session.whiteboardIsOpen) setActiveTool("whiteboard");
      isInitialLoadRef.current = false;
    }
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

  const toggleWorkspaceStage = () => {
    const newState = !isWorkspaceOpen;
    setIsWorkspaceOpen(newState);
    setActiveTool(
      newState
        ? "workspace"
        : isWhiteboardOpen
          ? "whiteboard"
          : isCircuitOpen
            ? "circuit"
            : null,
    );
    if (!socketRef.current) return;
    socketRef.current.emit("toggle-workspace-stage", {
      roomId: id,
      isOpen: newState,
    });
  };

  const toggleWhiteboard = () => {
    const newState = !isWhiteboardOpen;
    setIsWhiteboardOpen(newState);
    setActiveTool(
      newState
        ? "whiteboard"
        : isWorkspaceOpen
          ? "workspace"
          : isCircuitOpen
            ? "circuit"
            : null,
    );
    if (isHost && socketRef.current) {
      socketRef.current.emit("toggle-whiteboard", {
        roomId: id,
        isOpen: newState,
      });
    }
  };

  const toggleCircuit = () => {
    const newState = !isCircuitOpen;
    setIsCircuitOpen(newState);
    setActiveTool(
      newState
        ? "circuit"
        : isWorkspaceOpen
          ? "workspace"
          : isWhiteboardOpen
            ? "whiteboard"
            : null,
    );
    if (isHost && socketRef.current) {
      socketRef.current.emit("toggle-circuit", {
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
    socketRef.current.emit(
      hasAccess ? "whiteboard-revoke-writer" : "whiteboard-grant-writer",
      {
        roomId: id,
        userId: participantId,
      },
    );
  };

  const toggleQuizPanel = () => {
    const shouldOpen = !(
      activeSidebarTab === "quiz" &&
      sidebarOpen &&
      isQuizOpen &&
      !activeQuizRound
    );
    setActiveSidebarTab("quiz");
    setSidebarOpen(shouldOpen || Boolean(activeQuizRound));
    setIsQuizOpen(shouldOpen || Boolean(activeQuizRound));
    if (!shouldOpen && !activeQuizRound) setActiveSidebarTab("chat");
    setIsSessionMenuOpen(false);
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
    if (activeTool === "workspace" && !isWorkspaceOpen) {
      setActiveTool(
        isWhiteboardOpen ? "whiteboard" : isCircuitOpen ? "circuit" : null,
      );
    } else if (activeTool === "whiteboard" && !isWhiteboardOpen) {
      setActiveTool(
        isWorkspaceOpen ? "workspace" : isCircuitOpen ? "circuit" : null,
      );
    } else if (activeTool === "circuit" && !isCircuitOpen) {
      setActiveTool(
        isWorkspaceOpen ? "workspace" : isWhiteboardOpen ? "whiteboard" : null,
      );
    }
  }, [activeTool, isWorkspaceOpen, isWhiteboardOpen, isCircuitOpen]);

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
      { onSuccess: refetch },
    );
  };

  const handleKickParticipant = (participantId) => {
    if (confirm("Are you sure you want to kick this participant?")) {
      // Pass the specific ID to your mutation
      kickParticipantMutation.mutate({ sessionId: id, participantId });
    }
  };

  const availableStageTools = [
    isWorkspaceOpen ? { id: "workspace", label: "IDE", icon: LaptopIcon } : null,
    isWhiteboardOpen
      ? { id: "whiteboard", label: "Whiteboard", icon: PresentationIcon }
      : null,
    isCircuitOpen
      ? { id: "circuit", label: "Circuit", icon: CpuIcon }
      : null,
  ].filter(Boolean);

  const openToolStage = (toolId) => {
    setActiveTool((current) => (current === toolId ? null : toolId));
    setIsSessionMenuOpen(false);
  };

  const toggleChatSidebar = () => {
    const isChatActive = sidebarOpen && activeSidebarTab === "chat";
    setActiveSidebarTab("chat");
    setSidebarOpen(!isChatActive);
    setIsSessionMenuOpen(false);
  };

  const openSidebarTab = (tab) => {
    setActiveSidebarTab(tab);
    setSidebarOpen(true);
    if (tab === "quiz") setIsQuizOpen(true);
    setIsSessionMenuOpen(false);
  };

  const sessionMenuItems = [
    {
      id: "participants",
      label: "People",
      icon: UsersIcon,
      onClick: () => openSidebarTab("participants"),
      active: sidebarOpen && activeSidebarTab === "participants",
    },
    {
      id: "quiz",
      label: "Quiz",
      icon: ListChecksIcon,
      onClick: toggleQuizPanel,
      active: Boolean(
        activeQuizRound ||
        isQuizOpen ||
        (sidebarOpen && activeSidebarTab === "quiz"),
      ),
    },
    ...availableStageTools.map((tool) => ({
      id: tool.id,
      label: tool.label,
      icon: tool.icon,
      onClick: () => openToolStage(tool.id),
      active: activeTool === tool.id,
    })),
    ...(isLivestream
      ? [
          {
            id: "leave",
            label: "Leave",
            icon: LogOutIcon,
            onClick: () => navigate("/dashboard"),
          },
        ]
      : []),
  ];

  const closeQuizSidebar = () => {
    if (activeQuizRound) return;
    setIsQuizOpen(false);
    setActiveSidebarTab("chat");
  };

  const renderCall = ({ compact = false } = {}) => {
    if (!streamClient || !call) {
      return (
        <div className="h-full flex items-center justify-center">
          <Loader2Icon
            className={`animate-spin text-primary ${compact ? "size-8" : "size-10"}`}
          />
        </div>
      );
    }

    return (
      <StreamVideo client={streamClient}>
        <StreamCall call={call}>
          <VideoCallUI
            isHost={isHost}
            compact={compact}
            onLeave={() => navigate("/dashboard")}
          />
        </StreamCall>
      </StreamVideo>
    );
  };

  const renderWorkspaceStage = () => (
    <WorkspacePanel
      socket={socketRef.current}
      sessionId={id}
      sessionLanguage={session?.language}
      workspace={workspace}
      lessonState={workspaceLessonState}
      isHost={isHost}
      isLivestream={isLivestream}
    />
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
    if (layoutMode === "video" || !activeTool) {
      return (
        <div className="h-full min-h-0 overflow-hidden rounded-xl bg-base-300">
          {renderCall()}
        </div>
      );
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
                className={`btn btn-xs btn-square rounded-lg ${activeTool === tool.id ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setActiveTool(tool.id)}
                aria-label={tool.label}
                title={tool.label}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>

        <div className="h-full min-h-0">
          {activeTool === "workspace" && renderWorkspaceStage()}
          {activeTool === "whiteboard" && renderWhiteboardStage()}
          {activeTool === "circuit" && (
            <CircuitSimulatorPanel
              roomId={id}
              socket={socketRef.current}
              canWrite={isHost || isParticipant}
            />
          )}
        </div>

        {/* Picture-in-Picture Video for tools */}
        <div className="absolute bottom-3 right-3 z-[100] h-28 w-44 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border-2 border-primary/20 bg-base-300 shadow-2xl transition-all duration-300 ease-out md:bottom-4 md:right-4 md:h-48 md:w-72">
          {renderCall({ compact: true })}
        </div>
      </div>
    );
  };

  const renderSidebarContent = () => {
    if (activeSidebarTab === "participants") {
      return (
        <ParticipantsPanel
          session={session}
          isHost={isHost}
          onKickParticipant={handleKickParticipant}
        />
      );
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
    if (
      session?.courseAccess?.canJoinWithoutCode &&
      joinSessionMutation.isPending
    ) {
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
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Live classroom
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-base-content">
                {session?.courseAccess?.canJoinWithoutCode
                  ? "Joining class"
                  : "Join Session"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-base-content/62">
                {session?.courseAccess?.canJoinWithoutCode
                  ? "You already have course access. Join the room when you are ready."
                  : "Enter the access code shared by the host to join the live classroom."}
              </p>
              {session?.courseAccess?.canJoinWithoutCode ? (
                <div className="mt-6 space-y-4">
                  <p className="text-sm text-base-content/70">
                    You are approved for{" "}
                    <span className="font-semibold">
                      {session.courseAccess.courseTitle}
                    </span>
                    . Entering the live class now.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary h-12 w-full gap-2 rounded-xl"
                    onClick={handleJoinSession}
                  >
                    <DoorOpenIcon className="size-5" />
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
                  <button
                    type="submit"
                    className="btn btn-primary h-12 w-full gap-2 rounded-xl"
                  >
                    <KeyIcon className="size-5" />
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
      <div className="relative z-[80] shrink-0 border-b border-base-content/10 bg-base-100/95 px-3 py-2 backdrop-blur-sm md:px-5">
        <div className="flex min-h-12 flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-base-content md:text-xl">
              {getSessionLanguageLabel(session?.language)}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-base-content/60 md:text-sm">
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

          <div className="flex flex-wrap items-center justify-end gap-1.5 rounded-2xl border border-base-content/10 bg-base-200/55 p-1">
            <button
              type="button"
              onClick={toggleChatSidebar}
              className={`btn btn-sm btn-square rounded-lg ${sidebarOpen && activeSidebarTab === "chat" ? "btn-primary" : "btn-ghost"}`}
              aria-label={
                sidebarOpen && activeSidebarTab === "chat"
                  ? "Close chat"
                  : "Open chat"
              }
              title={
                sidebarOpen && activeSidebarTab === "chat"
                  ? "Close chat"
                  : "Chat"
              }
            >
              <MessageSquareIcon className="size-4" />
            </button>
            <div className="relative" ref={sessionMenuRef}>
              <button
                type="button"
                onClick={() => setIsSessionMenuOpen((current) => !current)}
                className={`btn btn-sm btn-square rounded-lg ${isSessionMenuOpen ? "btn-primary" : "btn-ghost"}`}
                aria-label="Session menu"
                title="Session menu"
              >
                <MenuIcon className="size-4" />
              </button>

              {isSessionMenuOpen && (
                <div className="absolute right-0 top-full z-[120] mt-2 w-52 rounded-2xl border border-base-content/10 bg-base-100 p-1.5 shadow-2xl">
                  <div className="space-y-0.5">
                    {sessionMenuItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.onClick}
                          disabled={item.disabled}
                          className={`btn btn-sm h-9 min-h-9 w-full justify-start gap-2 rounded-xl px-3 ${
                            item.active
                              ? "btn-primary"
                              : item.primary
                                ? "btn-primary"
                                : "btn-ghost"
                          }`}
                        >
                          <Icon className="size-4" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {isWhiteboardOpen && !canWriteWhiteboard && (
              <span className="badge badge-warning gap-1 rounded-lg px-2">
                <PencilOffIcon className="w-3 h-3" />
                View only
              </span>
            )}

            {isHost && session?.status === "active" && (
              <HostToolsPopover
                session={session}
                isAntiCheatEnabled={isAntiCheatEnabled}
                isWorkspaceOpen={isWorkspaceOpen}
                isWhiteboardOpen={isWhiteboardOpen}
                isCircuitOpen={isCircuitOpen}
                whiteboardWriteMode={whiteboardWriteMode}
                whiteboardWriterIds={whiteboardWriterIds}
                onToggleAntiCheat={toggleAntiCheat}
                onToggleWorkspaceStage={toggleWorkspaceStage}
                onToggleWhiteboard={toggleWhiteboard}
                onToggleCircuit={toggleCircuit}
                onWhiteboardWriteModeChange={handleWhiteboardWriteModeChange}
                onToggleWriterAccess={handleToggleWriterAccess}
                onToggleQuizPanel={toggleQuizPanel}
                onKickParticipant={handleKickParticipant}
                onEndSession={handleEndSession}
              />
            )}
          </div>
        </div>
      </div>

      <div
        className={`grid min-h-0 flex-1 gap-3 p-2 transition-[grid-template-columns] duration-300 ease-out md:p-3 ${
          sidebarOpen
            ? "lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]"
            : "lg:grid-cols-[minmax(0,1fr)_0rem]"
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
                      aria-label={tab.label}
                      title={tab.label}
                    >
                      <Icon className="size-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square rounded-lg"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
                title="Close"
              >
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              {renderSidebarContent()}
            </div>
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
                    aria-label={tab.label}
                    title={tab.label}
                  >
                    <Icon className="size-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square ml-2 rounded-lg"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              title="Close"
            >
              <XIcon className="size-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {renderSidebarContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionPage;
