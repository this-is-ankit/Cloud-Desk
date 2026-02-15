import { useEffect, useState, useRef } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";

const CollaborativeWhiteboard = ({ socket, roomId, initialData }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    if (!socket || !excalidrawAPI) return;

    // Listen for updates from other users
    const handleRemoteUpdate = (remoteElements) => {
      // Set flag to prevent echoing this update back to server
      isRemoteUpdate.current = true;
      
      excalidrawAPI.updateScene({
        elements: remoteElements
      });
      
      // Reset flag after a short delay or immediately
      // (Excalidraw updates are synchronous, so immediate is usually fine, 
      // but a small timeout is safer for state settling)
      setTimeout(() => { isRemoteUpdate.current = false; }, 50);
    };

    socket.on("whiteboard-update", handleRemoteUpdate);

    return () => {
      socket.off("whiteboard-update", handleRemoteUpdate);
    };
  }, [socket, excalidrawAPI]);

  const handleChange = (elements, appState) => {
    // Only emit if the change was local (user interaction)
    if (!isRemoteUpdate.current) {
      socket.emit("whiteboard-draw", {
        roomId,
        elements: elements
      });
    }
  };

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={{ elements: initialData || [] }}
        onChange={handleChange}
        // Optional: Simplify UI for teaching context
        viewModeEnabled={false} 
        zenModeEnabled={false} 
        gridModeEnabled={false}
      />
    </div>
  );
};

export default CollaborativeWhiteboard;