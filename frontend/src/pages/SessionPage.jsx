import { useUser, useAuth } from "@clerk/clerk-react";
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
} from "../hooks/useSessions";
import { executeCode } from "../lib/piston";
import Navbar from "../components/Navbar";
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

function SessionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useUser();
  const { getToken } = useAuth();
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

  const socketRef = useRef(null);
  const wasParticipantRef = useRef(false);
  const initializedSessionRef = useRef(null);

  const {
    data: sessionData,
    isLoading: loadingSession,
    refetch,
  } = useSessionById(id);

  const joinSessionMutation = useJoinSession();
  const endSessionMutation = useEndSession();
  const kickParticipantMutation = useKickParticipant();

  const session = sessionData?.session;

  // Calculate roles
  const isHost = session?.host?.clerkId === user?.id;
  const isParticipant = session?.participants?.some(
    (p) => p.clerkId === user?.id
  );
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

  // Keep the ref updated whenever isHost changes (e.g. after session loads)
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  useEffect(() => {
    isParticipantRef.current = isParticipant;
  }, [isParticipant]);

  const { call, channel, chatClient, streamClient } = useStreamClient(
    session,
    loadingSession,
    isHost,
    isParticipant
  );

  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [code, setCode] = useState("");

  const codePanelDefaultSize = isWhiteboardOpen ? 30 : 60;
  const whiteboardPanelDefaultSize = isCodeOpen ? 30 : 60;
  const videoPanelDefaultSize = isCodeOpen || isWhiteboardOpen ? 40 : 100;

  const panelGroupRef = useRef(null);

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

      const token = await getToken();
      if (!token || !isActive) return;

      socket = io(socketURL, {
        auth: { token },
      });
      socketRef.current = socket;

      socket.on("error", (error) => {
        if (
          error?.message === "Not authorized to join this session" &&
          !isHostRef.current &&
          !isParticipantRef.current
        ) {
          return;
        }
        console.error("Socket error:", error.message);
        toast.error(error.message);
      });

      socket.on("connect", () => {
        if (isHostRef.current || isParticipantRef.current) {
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
        setSelectedLanguage(newLang);
      });

      socket.on("code-space-state", (isOpen) => {
        setIsCodeOpen(isOpen);
      });

      socket.on("whiteboard-state", (isOpen) => {
        setIsWhiteboardOpen(Boolean(isOpen));
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
  }, [id, getToken, user?.id, applyWhiteboardPermissions]);

  useEffect(() => {
    if (!id || !socketRef.current) return;
    if (!isHost && !isParticipant) return;
    socketRef.current.emit("join-session", id);
  }, [id, isHost, isParticipant]);

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
    if (!socketRef.current) return;
    socketRef.current.emit("code-change", { roomId: id, code: newCode });
  };

  const handleLanguageChangeWrapper = (e) => {
    const newLang = e.target.value;
    setSelectedLanguage(newLang);
    setOutput(null);
    if (!socketRef.current) return;
    socketRef.current.emit("language-change", {
      roomId: id,
      language: newLang,
    });
  };

  const toggleCodeSpace = () => {
    const newState = !isCodeOpen;
    setIsCodeOpen(newState);
    if (!socketRef.current) return;
    socketRef.current.emit("toggle-code-space", {
      roomId: id,
      isOpen: newState,
    });
  };

  const toggleWhiteboard = () => {
    const newState = !isWhiteboardOpen;
    setIsWhiteboardOpen(newState);
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
    setSelectedLanguage(session.language);
    setCode(`// Start coding in ${session.language}...`);
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
    if (!accessCode) return;
    joinSessionMutation.mutate(
      { id, code: accessCode },
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

  if (!isHost && !isParticipant) {
    return (
      <div className="h-screen bg-base-100 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="card bg-base-200 w-full max-w-md shadow-xl border border-base-300">
            <div className="card-body">
              <h2 className="card-title text-2xl justify-center mb-2">
                Join Session
              </h2>
              <form onSubmit={handleJoinSession} className="space-y-4">
                <div className="form-control">
                  <div className="relative">
                    <KeyIcon className="absolute left-3 top-3 size-5 text-base-content/40" />
                    <input
                      type="text"
                      placeholder="Access Code"
                      className="input input-bordered w-full pl-10 font-mono uppercase"
                      value={accessCode}
                      onChange={(e) =>
                        setAccessCode(e.target.value.toUpperCase())
                      }
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-full">
                  Join Session
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-base-100 flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 bg-base-100 border-b border-base-300 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold text-base-content">
              {session?.language?.toUpperCase() || "SESSION"}
            </h1>
            <div className="flex items-center gap-2 text-sm text-base-content/60">
              <span>Host: {session?.host?.name}</span>
              <span>•</span>
              {/* UPDATED: Show count of participants */}
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

          <div className="flex items-center gap-2">
            <button
              onClick={toggleQuizPanel}
              className={`btn btn-sm gap-2 ${isQuizOpen ? "btn-accent" : "btn-ghost"}`}
            >
              <ListChecksIcon className="w-4 h-4" />
              Quiz
            </button>

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

        <div className="flex-1 overflow-hidden relative">
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
                        <PanelResizeHandle className="h-2 bg-base-300 hover:bg-primary transition-colors cursor-row-resize" />
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
                      />
                    </StreamCall>
                  </StreamVideo>
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
        </div>
      </div>
    </div>
  );
}

export default SessionPage;
