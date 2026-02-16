import { useEffect, useState, useRef } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";

const WhiteboardPanel = ({ roomId, socket, isHost, userName }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    if (!socket || !excalidrawAPI) return;

    // Listen for updates from other users
    const handleRemoteUpdate = ({ elements, appState }) => {
      isRemoteUpdate.current = true;
      
      excalidrawAPI.updateScene({
        elements,
        appState: { 
          ...appState, 
          collaborators: [],
          // FORCE remote updates to respect our Whiteboard color scheme
          // This prevents a user with Dark Mode from turning everyone else's screen dark
          viewBackgroundColor: "#ffffff", 
          theme: "light" 
        },
      });
      
      setTimeout(() => (isRemoteUpdate.current = false), 100);
    };

    socket.on("whiteboard-update", handleRemoteUpdate);

    return () => {
      socket.off("whiteboard-update", handleRemoteUpdate);
    };
  }, [socket, excalidrawAPI]);

  const handleChange = (elements, appState) => {
    if (!isRemoteUpdate.current && socket) {
      // FORCE White Background before sending to others
      const normalizedAppState = {
        ...appState,
        viewBackgroundColor: "#ffffff",
        theme: "light",
      };

      socket.emit("whiteboard-change", {
        roomId,
        elements,
        appState: normalizedAppState,
      });
    }
  };

  return (
    <div className="h-full w-full bg-white border-r border-base-300">
      <Excalidraw
        theme="light"
        initialData={{
          appState: { 
            viewBackgroundColor: "#ffffff", 
            currentItemStrokeColor: "#000000",
            theme: "light" 
          }
        }}
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        onChange={handleChange}
        UIOptions={{
          canvasActions: {
            saveToActiveFile: false,
            loadScene: false,
            export: { saveFileToDisk: true },
            changeViewBackgroundColor: false, // PREVENT users from changing background
            toggleTheme: false, // PREVENT users from switching to Dark Mode
          },
        }}
        name="Cloud Desk Whiteboard"
        user={{ name: userName }}
      />
    </div>
  );
};

export default WhiteboardPanel;