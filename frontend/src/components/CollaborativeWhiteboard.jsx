import { useEffect, useState, useRef, useCallback } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";

const CollaborativeWhiteboard = ({ socket, roomId, initialData }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const isRemoteUpdate = useRef(false);
  const timeoutRef = useRef(null); // Ref to hold the debounce timer

  useEffect(() => {
    if (!socket || !excalidrawAPI) return;

    // Handle incoming updates from other users
    const handleRemoteUpdate = (remoteElements) => {
      isRemoteUpdate.current = true; // Set flag to ignore the next onChange
      
      excalidrawAPI.updateScene({
        elements: remoteElements
      });
      
      // Reset flag after a short delay
      setTimeout(() => { isRemoteUpdate.current = false; }, 100);
    };

    socket.on("whiteboard-update", handleRemoteUpdate);

    return () => {
      socket.off("whiteboard-update", handleRemoteUpdate);
    };
  }, [socket, excalidrawAPI]);

  // Debounced Change Handler
  const handleChange = useCallback((elements, appState) => {
    // 1. If this change was triggered by a remote update, do not emit back
    if (isRemoteUpdate.current) return;

    // 2. Clear the previous timer
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // 3. Set a new timer to emit after 100ms of inactivity
    timeoutRef.current = setTimeout(() => {
      socket.emit("whiteboard-draw", {
        roomId,
        elements: elements
      });
    }, 100); 
  }, [socket, roomId]);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={{ elements: initialData || [] }}
        onChange={handleChange}
        viewModeEnabled={false} 
        zenModeEnabled={false} 
        gridModeEnabled={false}
        // Optional: Hide Save/Load buttons to keep UI clean
        UIOptions={{
           canvasActions: { loadScene: false, saveToActiveFile: false }
        }}
      />
    </div>
  );
};

export default CollaborativeWhiteboard;