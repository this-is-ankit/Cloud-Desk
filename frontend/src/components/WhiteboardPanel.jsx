import { useEffect, useState, useRef, useCallback } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

const SAFE_APP_STATE = {
  viewBackgroundColor: "#ffffff",
  theme: "light",
  currentItemStrokeColor: "#000000",
};

const MAX_COORDINATE = 4000;
const MAX_ELEMENTS = 2000;

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

const isSafePoint = (point) => {
  if (!Array.isArray(point) || point.length < 2) return false;
  const [x, y] = point;
  return (
    isFiniteNumber(x) &&
    isFiniteNumber(y) &&
    Math.abs(x) <= MAX_COORDINATE &&
    Math.abs(y) <= MAX_COORDINATE
  );
};

const sanitizeElement = (element) => {
  if (!element || typeof element !== "object") return null;

  const newElement = { ...element }; // Start with a copy of the original element

  // Sanitize x, y
  newElement.x = isFiniteNumber(element.x) ? element.x : 0;
  newElement.y = isFiniteNumber(element.y) ? element.y : 0;

  // Reject element if its base position is out of bounds
  if (Math.abs(newElement.x) > MAX_COORDINATE || Math.abs(newElement.y) > MAX_COORDINATE) {
    console.warn("Element position out of bounds, rejecting:", element);
    return null;
  }

  // Sanitize points array if present
  if (Array.isArray(element.points)) {
    newElement.points = element.points.filter(isSafePoint);
    if (newElement.points.length === 0 && element.type === "freedraw") {
        console.warn("Freedraw element with no safe points, rejecting:", element);
        return null; // Reject freedraw if it has no valid points
    }
  } else if (element.type === "freedraw") {
       console.warn("Freedraw element without a points array, rejecting:", element);
       return null; // Freedraw must have points
  }


  // Special handling for width and height:
  if (element.type === "freedraw") {
    // If width or height is 0, set to a minimal positive value (e.g., 1)
    // to give Excalidraw a valid bounding box, if it struggles with 0 values.
    // Otherwise, ensure they are finite.
    if (!isFiniteNumber(newElement.width) || newElement.width === 0) {
      newElement.width = 1; // Or some small positive number
    }
    if (!isFiniteNumber(newElement.height) || newElement.height === 0) {
      newElement.height = 1; // Or some small positive number
    }
  } else {
      // For other elements, ensure width/height are finite and not excessively large
      if (!isFiniteNumber(newElement.width)) newElement.width = 0;
      if (!isFiniteNumber(newElement.height)) newElement.height = 0;

      if (Math.abs(newElement.width) > MAX_COORDINATE || Math.abs(newElement.height) > MAX_COORDINATE) {
          console.warn("Element width/height out of bounds for non-freedraw type, rejecting:", element);
          return null;
      }
  }

  return newElement;
};

const sanitizeElements = (elements) => {
  if (!Array.isArray(elements)) return [];
  return elements.slice(0, MAX_ELEMENTS).map(sanitizeElement).filter(Boolean);
};

const WhiteboardPanel = ({ roomId, socket, userName, scene, onSceneChange }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef(null);
  const isApplyingRemoteScene = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height)) {
          setDimensions({ width: Math.floor(width), height: Math.floor(height) });
          setIsReady(true);
        }
      }
    });

    resizeObserver.observe(container);

    const initialWidth = container.offsetWidth;
    const initialHeight = container.offsetHeight;

    if (initialWidth > 0 && initialHeight > 0) {
      setDimensions({ width: initialWidth, height: initialHeight });
      setIsReady(true);
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!excalidrawAPI || !Array.isArray(scene?.elements)) return;

    const safeElements = sanitizeElements(scene.elements);

    isApplyingRemoteScene.current = true;
    excalidrawAPI.updateScene({
      elements: safeElements,
      appState: {
        ...SAFE_APP_STATE,
        collaborators: [],
      },
    });

    requestAnimationFrame(() => {
      isApplyingRemoteScene.current = false;
    });
  }, [scene, excalidrawAPI]);

  const handleChange = useCallback((elements, appState) => {
    if (isApplyingRemoteScene.current || !socket || !roomId) return;

    const safeElements = sanitizeElements(elements);

    const normalizedAppState = {
      ...SAFE_APP_STATE,
      currentItemStrokeColor: appState?.currentItemStrokeColor || SAFE_APP_STATE.currentItemStrokeColor,
    };

    const nextScene = { elements: safeElements, appState: normalizedAppState };
    console.log('WhiteboardPanel: Emitting change to server', nextScene.elements); // ADDED LOG
    // onSceneChange?.(nextScene); // REMOVED: Parent state should only be updated by server-echoed events

    socket.emit("whiteboard-change", {
      roomId,
      ...nextScene,
    });
  }, [socket, roomId]);

  if (!isReady || dimensions.width === 0 || dimensions.height === 0) {
    return (
      <div 
        ref={containerRef}
        className="h-full w-full bg-white border-r border-base-300 flex items-center justify-center"
      >
        <div className="text-sm text-base-content/50">Loading whiteboard...</div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-full w-full bg-white border-r border-base-300"
      style={{ minWidth: 100, minHeight: 100 }}
    >
      <Excalidraw
        theme="light"
        initialData={{
          appState: SAFE_APP_STATE
        }}
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        onChange={handleChange}
        UIOptions={{
          canvasActions: {
            saveToActiveFile: false,
            loadScene: false,
            export: { saveFileToDisk: true },
            changeViewBackgroundColor: false,
            toggleTheme: false,
          },
        }}
        name="Cloud Desk Whiteboard"
        user={{ name: userName }}
        width="100%"
        height="100%"
      />
    </div>
  );
};

export default WhiteboardPanel;
