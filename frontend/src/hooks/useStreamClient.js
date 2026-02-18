import { useState, useEffect } from "react";
import { StreamChat } from "stream-chat";
import toast from "react-hot-toast";
import { initializeStreamClient, disconnectStreamClient } from "../lib/stream";
import { sessionApi } from "../api/sessions";

function useStreamClient(session, loadingSession, isHost, isParticipant) {
  const [streamClient, setStreamClient] = useState(null);
  const [call, setCall] = useState(null);
  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [isInitializingCall, setIsInitializingCall] = useState(true);
  const callId = session?.callId;
  const sessionStatus = session?.status;

  useEffect(() => {
    let isMounted = true;
    let videoCall = null;
    let chatClientInstance = null;

    const initCall = async () => {
      if (!callId || !isHost && !isParticipant || sessionStatus === "completed") {
        setIsInitializingCall(false);
        return;
      }

      setIsInitializingCall(true);

      try {
        const { token, userId, userName, userImage } = await sessionApi.getStreamToken();

        const client = await initializeStreamClient(
          {
            id: userId,
            name: userName,
            image: userImage,
          },
          token
        );
        if (!isMounted) return;

        setStreamClient(client);

        videoCall = client.call("default", callId);
        await videoCall.join({ create: true });
        if (!isMounted) return;
        setCall(videoCall);

        const apiKey = import.meta.env.VITE_STREAM_API_KEY;
        chatClientInstance = StreamChat.getInstance(apiKey);

        await chatClientInstance.connectUser(
          {
            id: userId,
            name: userName,
            image: userImage,
          },
          token
        );
        if (!isMounted) return;
        setChatClient(chatClientInstance);

        const chatChannel = chatClientInstance.channel("messaging", callId);
        await chatChannel.watch();
        if (!isMounted) return;
        setChannel(chatChannel);
      } catch (error) {
        toast.error("Failed to join video call");
        console.error("Error init call", error);
      } finally {
        if (isMounted) {
          setIsInitializingCall(false);
        }
      }
    };

    if (!loadingSession) initCall();

    // cleanup - performance reasons
    return () => {
      isMounted = false;
      // iife
      (async () => {
        try {
          if (videoCall) await videoCall.leave();
          if (chatClientInstance) await chatClientInstance.disconnectUser();
          await disconnectStreamClient();
        } catch (error) {
          console.error("Cleanup error:", error);
        }
      })();
    };
  }, [callId, sessionStatus, loadingSession, isHost, isParticipant]);

  return {
    streamClient,
    call,
    chatClient,
    channel,
    isInitializingCall,
  };
}

export default useStreamClient;
