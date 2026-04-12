import {
  CallControls,
  CallingState,
  SpeakerLayout,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import {
  Loader2Icon,
} from "./icons/ModernIcons";
import { useNavigate } from "react-router";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import "stream-chat-react/dist/css/v2/index.css";
import "../styles/stream-overrides.css";

function VideoCallUI({
  isHost = false,
  compact = false,
  showControls = true,
  onLeave,
}) {
  const navigate = useNavigate();
  const {
    useCallCallingState,
  } = useCallStateHooks();
  const callingState = useCallCallingState();
  const handleLeave = onLeave || (() => navigate("/dashboard"));

  if (callingState === CallingState.JOINING) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2Icon className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
          <p className="text-lg">Joining call...</p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="h-full min-h-0 overflow-hidden rounded-lg bg-base-300 str-video">
        <SpeakerLayout 
          participantsBarPosition="bottom" 
        />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-2 overflow-hidden relative str-video">
      <SpeakerLayout participantsBarPosition="bottom" />
      {showControls && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <CallControls onLeave={handleLeave} />
        </div>
      )}
    </div>
  );
}

export default VideoCallUI;
