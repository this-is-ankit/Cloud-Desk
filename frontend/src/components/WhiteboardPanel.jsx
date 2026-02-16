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

  const x = isFiniteNumber(element.x) ? element.x : 0;
  const y = isFiniteNumber(element.y) ? element.y : 0;
  const width = isFiniteNumber(element.width) ? element.width : 0;
  const height = isFiniteNumber(element.height) ? element.height : 0;

  if (
    Math.abs(x) > MAX_COORDINATE ||
    Math.abs(y) > MAX_COORDINATE ||
    Math.abs(width) > MAX_COORDINATE ||
    Math.abs(height) > MAX_COORDINATE
  ) {
    return null;
  }

  if (Array.isArray(element.points) && !element.points.every(isSafePoint)) {
    return null;
  }

  return {
    ...element,
    x,
    y,
    width,
    height,
    points: Array.isArray(element.points) ? element.points.filter(isSafePoint) : element.points,
  };
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
    onSceneChange?.(nextScene);
    socket.emit("whiteboard-change", {
      roomId,
      ...nextScene,
    });
  }, [socket, roomId, onSceneChange]);

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
