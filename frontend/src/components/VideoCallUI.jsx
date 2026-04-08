import {
  CallControls,
  CallingState,
  LivestreamLayout,
  SpeakerLayout,
  ToggleAudioPublishingButton,
  ToggleVideoPublishingButton,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { Loader2Icon, UsersIcon } from "./icons/ModernIcons";
import { useNavigate } from "react-router";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import "stream-chat-react/dist/css/v2/index.css";
import "../styles/stream-overrides.css";

function VideoCallUI({
  sessionType = "interactive",
  isHost = false,
  isLive = false,
  onStartLivestream,
  onStopLivestream,
  compact = false,
  showHeader = false,
  showControls = true,
  showLivestreamActions = true,
  onLeave,
}) {
  const navigate = useNavigate();
  const { useCallCallingState, useParticipantCount, useIsCallLive } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participantCount = useParticipantCount();
  const streamIsLive = useIsCallLive?.();
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

  if (sessionType === "livestream") {
    const live = Boolean(isLive || streamIsLive);

    if (compact) {
      return (
        <div className="h-full min-h-0 overflow-hidden rounded-lg bg-base-300 str-video">
          {live || isHost ? (
            <LivestreamLayout muted={!isHost} enableFullScreen={false} showDuration={false} showSpeakerName={false} />
          ) : (
            <div className="flex h-full items-center justify-center p-3 text-center text-xs font-semibold">
              Waiting for host
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="h-full min-h-0 flex flex-col gap-2 overflow-hidden relative str-video">
        {showHeader && (
          <div className="shrink-0 flex items-center justify-between gap-3 rounded-lg bg-base-100 p-2 shadow">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Live stream</p>
              <p className="text-sm text-base-content/60">
                {live ? "Live now" : isHost ? "Backstage" : "Waiting for host"}
              </p>
            </div>
            {isHost && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-base-content/10 bg-base-200/60 px-2 py-1">
                  <ToggleAudioPublishingButton />
                  <ToggleVideoPublishingButton />
                </div>
                {showLivestreamActions && (
                  <>
                    <button type="button" className="btn btn-primary btn-sm rounded-lg" onClick={onStartLivestream} disabled={live}>
                      Go Live
                    </button>
                    <button type="button" className="btn btn-outline btn-sm rounded-lg" onClick={onStopLivestream} disabled={!live}>
                      Stop Live
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg bg-base-300">
          {live || isHost ? (
            <LivestreamLayout muted={!isHost} />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <div>
                <p className="text-lg font-bold">Waiting for host to go live</p>
                <p className="mt-2 text-sm text-base-content/60">The stream will appear here when the teacher starts broadcasting.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden relative str-video">
      {showHeader && (
        <div className="flex items-center justify-between gap-2 bg-base-100 p-3 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-primary" />
            <span className="font-semibold">
              {participantCount} {participantCount === 1 ? "participant" : "participants"}
            </span>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 bg-base-300 rounded-lg overflow-hidden relative">
        <SpeakerLayout />
      </div>

      {showControls && (
        <div className="bg-base-100 p-3 rounded-lg shadow flex justify-center">
          <CallControls onLeave={handleLeave} />
        </div>
      )}
    </div>
  );
}
export default VideoCallUI;
