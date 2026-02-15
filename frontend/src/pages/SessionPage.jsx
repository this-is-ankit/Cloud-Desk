import { useUser } from "@clerk/clerk-react";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import io from "socket.io-client";
import {
  useEndSession,
  useJoinSession,
  useSessionById,
  useKickParticipant,
} from "../hooks/useSessions";
import { executeCode } from "../lib/piston";
import Navbar from "../components/Navbar";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import {
  Loader2Icon,
  LogOutIcon,
  KeyIcon,
  UserMinusIcon,
  CodeIcon,
  EyeOffIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  PenTool as PenToolIcon, // IMP: Imported PenTool
} from "lucide-react";
import toast from "react-hot-toast";
import CodeEditorPanel from "../components/CodeEditorPanel";
import OutputPanel from "../components/OutputPanel";
// IMP: Import the Whiteboard Component
import CollaborativeWhiteboard from "../components/CollaborativeWhiteboard"; 

import useStreamClient from "../hooks/useStreamClient";
import { StreamCall, StreamVideo } from "@stream-io/video-react-sdk";
import VideoCallUI from "../components/VideoCallUI";

function SessionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useUser();
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [accessCode, setAccessCode] = useState("");

  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [isAntiCheatEnabled, setIsAntiCheatEnabled] = useState(false);

  const socketRef = useRef(null);
  const [wasParticipant, setWasParticipant] = useState(false);

  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);

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
    (p) => p.clerkId === user?.id,
  );

  const isHostRef = useRef(isHost);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  const { call, channel, chatClient, isInitializingCall, streamClient } =
    useStreamClient(session, loadingSession, isHost, isParticipant);

  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [code, setCode] = useState("");

  useEffect(() => {
    const socketURL =
      import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

    socketRef.current = io(socketURL);

    if (id) {
      socketRef.current.emit("join-session", id);
    }

    socketRef.current.on("code-update", (newCode) => {
      setCode((prevCode) => {
        if (prevCode !== newCode) return newCode;
        return prevCode;
      });
    });

    socketRef.current.on("language-update", (newLang) => {
      setSelectedLanguage(newLang);
    });

    socketRef.current.on("code-space-state", (isOpen) => {
      setIsCodeOpen(isOpen);
      // If code opens remotely, ensure whiteboard closes locally to match view
      if (isOpen) setIsWhiteboardOpen(false);
    });

    socketRef.current.on("whiteboard-state", (isOpen) => {
      setIsWhiteboardOpen(isOpen);
      // If whiteboard opens remotely, ensure code closes locally to match view
      if (isOpen) setIsCodeOpen(false);
    });

    socketRef.current.on("anti-cheat-update", (isEnabled) => {
      setIsAntiCheatEnabled(isEnabled);
      if (isEnabled) {
        toast("Anti-Cheat mode enabled by host.", { icon: "🛡️" });
      } else {
        toast("Anti-Cheat mode disabled.");
      }
    });

    socketRef.current.on("cheat-alert", ({ userId, reason }) => {
      const amIHost = isHostRef.current;
      console.log("⚠️ Cheat Alert Received:", {
        alertUserId: userId,
        myUserId: user?.id,
        amIHost,
        reason,
      });

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

    return () => {
      socketRef.current.disconnect();
    };
  }, [id]);

  useEffect(() => {
    if (session?.isCodeOpen !== undefined) setIsCodeOpen(session.isCodeOpen);
    if (session?.isWhiteboardOpen !== undefined) setIsWhiteboardOpen(session.isWhiteboardOpen); // Handle initial load
    if (session?.isAntiCheatEnabled !== undefined)
      setIsAntiCheatEnabled(session.isAntiCheatEnabled);
  }, [session]);

  useEffect(() => {
    if (!isParticipant || !isAntiCheatEnabled || !user?.id) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        socketRef.current.emit("cheat-detected", {
          roomId: id,
          userId: user.id,
          reason: "tab-switch",
        });
        toast.error("⚠️ Warning: Tab switching is monitored!");
      }
    };

    const handleBlur = () => {
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

  const toggleWhiteboard = () => {
    const newState = !isWhiteboardOpen;
    setIsWhiteboardOpen(newState);
    
    // Improvement: Automatically close code if opening whiteboard
    if (newState) setIsCodeOpen(false);

    socketRef.current.emit("toggle-whiteboard", {
      roomId: id,
      isOpen: newState,
    });
    
    // Also emit code-space-state false to keep everyone in sync? 
    // Usually better to handle explicit toggles, but for now local state sync is enough 
    // provided the listeners above handle the mutually exclusive logic.
  };

  const toggleCodeSpace = () => {
    const newState = !isCodeOpen;
    setIsCodeOpen(newState);

    // Improvement: Automatically close whiteboard if opening code
    if (newState) setIsWhiteboardOpen(false);

    socketRef.current.emit("toggle-code-space", {
      roomId: id,
      isOpen: newState,
    });
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socketRef.current.emit("code-change", { roomId: id, code: newCode });
  };

  const handleLanguageChangeWrapper = (e) => {
    const newLang = e.target.value;
    setSelectedLanguage(newLang);
    setOutput(null);
    socketRef.current.emit("language-change", {
      roomId: id,
      language: newLang,
    });
  };

  useEffect(() => {
    if (isParticipant) setWasParticipant(true);
  }, [isParticipant]);

  useEffect(() => {
    if (wasParticipant && !isParticipant && !isHost) {
      navigate("/dashboard");
      toast.error("You have been kicked from the session.");
    }
  }, [wasParticipant, isParticipant, isHost, navigate]);

  useEffect(() => {
    if (!session || !user || loadingSession) return;
  }, [session, user, loadingSession, isHost, isParticipant]);

  useEffect(() => {
    if (!session || loadingSession) return;
    if (session.status === "completed") navigate("/dashboard");
  }, [session, loadingSession, navigate]);

  useEffect(() => {
    if (session?.language) {
      setSelectedLanguage(session.language);
      setCode(`// Start coding in ${session.language}...`);
    }
  }, [session]);

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
      { onSuccess: refetch },
    );
  };

  const handleKickParticipant = (participantId) => {
    if (confirm("Are you sure you want to kick this participant?")) {
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

          {isHost && session?.status === "active" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newState = !isAntiCheatEnabled;
                  setIsAntiCheatEnabled(newState);
                  socketRef.current.emit("toggle-anti-cheat", {
                    roomId: id,
                    isEnabled: newState,
                  });
                }}
                className={`btn btn-sm gap-2 ${
                  isAntiCheatEnabled ? "btn-warning" : "btn-ghost"
                }`}
              >
                {isAntiCheatEnabled ? (
                  <ShieldAlertIcon className="w-4 h-4" />
                ) : (
                  <ShieldCheckIcon className="w-4 h-4" />
                )}
                {isAntiCheatEnabled ? "Monitor On" : "Monitor Off"}
              </button>

              <button
                onClick={toggleCodeSpace}
                className={`btn btn-sm gap-2 ${
                  isCodeOpen ? "btn-primary" : "btn-ghost"
                }`}
              >
                {isCodeOpen ? (
                  <EyeOffIcon className="w-4 h-4" />
                ) : (
                  <CodeIcon className="w-4 h-4" />
                )}
                {isCodeOpen ? "Close Code" : "Start Coding"}
              </button>

              <button
                onClick={toggleWhiteboard}
                className={`btn btn-sm gap-2 ${isWhiteboardOpen ? "btn-primary" : "btn-ghost"}`}
              >
                <PenToolIcon className="w-4 h-4" />
                {isWhiteboardOpen ? "Close Board" : "Whiteboard"}
              </button>

              {session?.participants?.length > 0 && (
                <div className="dropdown dropdown-end">
                  <label
                    tabIndex={0}
                    className="btn btn-ghost btn-sm text-error"
                  >
                    <UserMinusIcon className="w-4 h-4" />
                  </label>
                  <ul
                    tabIndex={0}
                    className="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box w-52"
                  >
                    {session.participants.map((p) => (
                      <li key={p._id}>
                        <button onClick={() => handleKickParticipant(p._id)}>
                          Kick {p.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                onClick={handleEndSession}
                className="btn btn-error btn-sm gap-2"
              >
                <LogOutIcon className="w-4 h-4" /> End
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden relative">
          <PanelGroup direction="horizontal">
            {(isCodeOpen || isWhiteboardOpen) && (
              <>
                <Panel id="code-panel" order={1} defaultSize={50} minSize={30}>
                  <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-hidden">
                      {isWhiteboardOpen ? (
                        /* Ensure socket exists before rendering to prevent errors */
                        socketRef.current && (
                          <CollaborativeWhiteboard
                            socket={socketRef.current}
                            roomId={id}
                            initialData={session?.whiteboardData}
                          />
                        )
                      ) : (
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
                      )}
                    </div>
                  </div>
                </Panel>
                <PanelResizeHandle className="w-2 bg-base-300 hover:bg-primary transition-colors cursor-col-resize" />
              </>
            )}

            <Panel
              id="video-panel"
              order={2}
              defaultSize={isCodeOpen ? 50 : 100}
              minSize={30}
            >
              <div className="h-full bg-base-200 p-4 overflow-auto">
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
              </div>
            </Panel>
          </PanelGroup>
        </div>
      </div>
    </div>
  );
}

export default SessionPage;