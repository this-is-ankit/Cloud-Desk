import { useUser } from "@clerk/clerk-react";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import io from "socket.io-client";
import {
  useEndSession,
  useJoinSession,
  useSessionById,
  useKickParticipant
} from "../hooks/useSessions";
import { executeCode } from "../lib/piston";
import Navbar from "../components/Navbar";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Loader2Icon, LogOutIcon, PhoneOffIcon, KeyIcon, UserMinusIcon } from "lucide-react";
import toast from "react-hot-toast"; // IMPORT TOAST
import CodeEditorPanel from "../components/CodeEditorPanel";
import OutputPanel from "../components/OutputPanel";

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

  const socketRef = useRef(null);
  // Track if user was previously a participant
  const [wasParticipant, setWasParticipant] = useState(false);

  const { data: sessionData, isLoading: loadingSession, refetch } = useSessionById(id);

  const joinSessionMutation = useJoinSession();
  const endSessionMutation = useEndSession();
  const kickParticipantMutation = useKickParticipant();

  const session = sessionData?.session;
  const isHost = session?.host?.clerkId === user?.id;
  const isParticipant = session?.participant?.clerkId === user?.id;

  const { call, channel, chatClient, isInitializingCall, streamClient } = useStreamClient(
    session,
    loadingSession,
    isHost,
    isParticipant
  );

  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [code, setCode] = useState("");

  useEffect(() => {
    // 1. Initialize Connection
    socketRef.current = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:3000");

    // 2. Join the specific session room
    if (id) {
      socketRef.current.emit("join-session", id);
    }

    // 3. Listen for incoming code updates
    socketRef.current.on("code-update", (newCode) => {
      // Only update if code is different to prevent cursor jumping/loops
      setCode((prevCode) => {
        if (prevCode !== newCode) return newCode;
        return prevCode;
      });
    });

    // 4. Listen for language updates
    socketRef.current.on("language-update", (newLang) => {
      setSelectedLanguage(newLang);
    });

    // Cleanup on unmount
    return () => {
      socketRef.current.disconnect();
    };
  }, [id]);

const handleCodeChange = (newCode) => {
    setCode(newCode);
    socketRef.current.emit("code-change", { roomId: id, code: newCode });
  };

  const handleLanguageChangeWrapper = (e) => {
    const newLang = e.target.value;
    setSelectedLanguage(newLang);
    setOutput(null);
    socketRef.current.emit("language-change", { roomId: id, language: newLang });
  };

  // --------------------------------------------------------------------------
  // KICK REDIRECT LOGIC
  // --------------------------------------------------------------------------
  useEffect(() => {
    // If currently a participant, set flag to true
    if (isParticipant) {
      setWasParticipant(true);
    }
  }, [isParticipant]);

  useEffect(() => {
    // If was participant, but now ISN'T (and isn't host), it means they were kicked.
    if (wasParticipant && !isParticipant && !isHost) {
      navigate("/dashboard");
      toast.error("You have been kicked from the session.");
    }
  }, [wasParticipant, isParticipant, isHost, navigate]);
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!session || !user || loadingSession) return;
    // Auto-join disabled - relying on manual Join Form
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

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setSelectedLanguage(newLang);
    setOutput(null);
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput(null);
    const result = await executeCode(selectedLanguage, code);
    setOutput(result);
    setIsRunning(false);
  };

  const handleEndSession = () => {
    if (confirm("Are you sure you want to end this session? All participants will be notified.")) {
      endSessionMutation.mutate(id, { onSuccess: () => navigate("/dashboard") });
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

  const handleKickParticipant = () => {
    if (confirm("Are you sure you want to kick the participant? They will be removed from the session.")) {
      kickParticipantMutation.mutate(id);
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
              <h2 className="card-title text-2xl justify-center mb-2">Join Session</h2>
              <p className="text-center text-base-content/70 mb-6">
                Enter the access code shared by the host to join the {session.language} session.
              </p>

              <form onSubmit={handleJoinSession} className="space-y-4">
                <div className="form-control">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyIcon className="size-5 text-base-content/40" />
                    </div>
                    <input
                      type="text"
                      placeholder="Access Code (e.g., X7Y2Z1)"
                      className="input input-bordered w-full pl-10 font-mono tracking-widest uppercase"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={joinSessionMutation.isPending || !accessCode}
                >
                  {joinSessionMutation.isPending ? (
                    <Loader2Icon className="size-5 animate-spin" />
                  ) : (
                    "Join Session"
                  )}
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

      <div className="flex-1">
        <PanelGroup direction="horizontal">
          <Panel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col">
              <div className="p-4 bg-base-100 border-b border-base-300 flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-base-content">
                    {session?.language?.toUpperCase() || "SESSION"}
                  </h1>
                  <div className="flex items-center gap-2 text-sm text-base-content/60">
                    <span>Host: {session?.host?.name}</span>
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
                    {session.participant && (
                      <button
                        onClick={handleKickParticipant}
                        disabled={kickParticipantMutation.isPending}
                        className="btn btn-ghost btn-sm text-error hover:bg-error/10"
                        title="Kick Participant"
                      >
                        {kickParticipantMutation.isPending ? (
                          <Loader2Icon className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserMinusIcon className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    <button
                      onClick={handleEndSession}
                      disabled={endSessionMutation.isPending}
                      className="btn btn-error btn-sm gap-2"
                    >
                      {endSessionMutation.isPending ? (
                        <Loader2Icon className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogOutIcon className="w-4 h-4" />
                      )}
                      End Session
                    </button>
                  </div>
                )}
              </div>

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

          <Panel defaultSize={50} minSize={30}>
            <div className="h-full bg-base-200 p-4 overflow-auto">
              {isInitializingCall ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2Icon className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
                    <p className="text-lg">Connecting to video call...</p>
                  </div>
                </div>
              ) : !streamClient || !call ? (
                <div className="h-full flex items-center justify-center">
                  <div className="card bg-base-100 shadow-xl max-w-md">
                    <div className="card-body items-center text-center">
                      <div className="w-24 h-24 bg-error/10 rounded-full flex items-center justify-center mb-4">
                        <PhoneOffIcon className="w-12 h-12 text-error" />
                      </div>
                      <h2 className="card-title text-2xl">Connection Failed</h2>
                      <p className="text-base-content/70">Unable to connect to the video call</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full">
                  <StreamVideo client={streamClient}>
                    <StreamCall call={call}>
                      <VideoCallUI chatClient={chatClient} channel={channel} />
                    </StreamCall>
                  </StreamVideo>
                </div>
              )}
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

export default SessionPage;
