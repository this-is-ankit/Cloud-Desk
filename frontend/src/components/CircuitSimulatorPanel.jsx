import { useEffect, useState, useRef, useCallback } from "react";

const COMPONENT_TYPES = {
  resistor: { label: "Resistor", color: "#ef4444", width: 60, height: 30 },
  capacitor: { label: "Capacitor", color: "#3b82f6", width: 40, height: 40 },
  "and-gate": { label: "AND Gate", color: "#10b981", width: 80, height: 50 },
};

const CircuitSimulatorPanel = ({ roomId, socket, canWrite }) => {
  const [circuitState, setCircuitState] = useState({ components: [], wires: [] });
  const [dragging, setDragging] = useState(null);
  const [wireStart, setWireStart] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on("room/circuit/sync", ({ circuitState: initialCircuitState }) => {
      if (initialCircuitState) {
        setCircuitState(initialCircuitState);
      }
    });

    socket.on("room/circuit/update", (nextState) => {
      if (nextState) {
        setCircuitState(nextState);
      }
    });

    // Request sync if not received
    socket.emit("join-session", roomId);

    return () => {
      socket.off("room/circuit/sync");
      socket.off("room/circuit/update");
    };
  }, [socket, roomId]);

  const emitChange = useCallback((nextState) => {
    if (!socket) return;
    socket.emit("room/circuit/change", { roomId, circuitState: nextState });
  }, [socket, roomId]);

  const handleAddComponent = (type) => {
    if (!canWrite) return;
    
    const newComponent = {
      id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      ...COMPONENT_TYPES[type],
    };

    const nextState = {
      ...circuitState,
      components: [...circuitState.components, newComponent],
    };

    setCircuitState(nextState);
    emitChange(nextState);
  };

  const handleMouseDown = (e, target, type) => {
    if (!canWrite) return;
    e.preventDefault();
    e.stopPropagation();

    if (type === "component") {
      const rect = canvasRef.current.getBoundingClientRect();
      setDragging({
        id: target.id,
        offsetX: e.clientX - rect.left - target.x,
        offsetY: e.clientY - rect.top - target.y,
      });
    } else if (type === "terminal") {
      setWireStart(target);
    }
  };

  const handleMouseMove = (e) => {
    if (!canWrite) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    if (dragging) {
      const nextComponents = circuitState.components.map((comp) => {
        if (comp.id === dragging.id) {
          return { ...comp, x: x - dragging.offsetX, y: y - dragging.offsetY };
        }
        return comp;
      });
      setCircuitState({ ...circuitState, components: nextComponents });
    }
  };

  const handleMouseUp = (e, target, type) => {
    if (!canWrite) return;
    
    if (dragging) {
      emitChange(circuitState);
      setDragging(null);
    } else if (wireStart && type === "terminal") {
      if (wireStart.compId !== target.compId) {
        const newWire = {
          id: `wire-${Date.now()}`,
          from: wireStart,
          to: target,
        };
        const nextState = {
          ...circuitState,
          wires: [...circuitState.wires, newWire],
        };
        setCircuitState(nextState);
        emitChange(nextState);
      }
      setWireStart(null);
    } else {
      setWireStart(null);
    }
  };

  const getTerminalPos = (comp, side) => {
    if (side === "left") return { x: comp.x, y: comp.y + comp.height / 2 };
    return { x: comp.x + comp.width, y: comp.y + comp.height / 2 };
  };

  const clearCanvas = () => {
    if (!canWrite) return;
    if (confirm("Clear all components and wires?")) {
      const nextState = { components: [], wires: [] };
      setCircuitState(nextState);
      emitChange(nextState);
    }
  };

  return (
    <div className="flex flex-col h-full bg-base-100 p-4 overflow-hidden select-none">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold">Collaborative Circuit Simulator</h3>
          <p className="text-xs text-base-content/50">Real-time collaborative ECE Wedge</p>
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <>
              <button className="btn btn-sm btn-outline btn-primary" onClick={() => handleAddComponent("resistor")}>+ Resistor</button>
              <button className="btn btn-sm btn-outline btn-info" onClick={() => handleAddComponent("capacitor")}>+ Capacitor</button>
              <button className="btn btn-sm btn-outline btn-success" onClick={() => handleAddComponent("and-gate")}>+ AND Gate</button>
              <button className="btn btn-sm btn-outline btn-error" onClick={clearCanvas}>Clear</button>
            </>
          )}
        </div>
      </div>
      
      <div className="flex-1 relative border-2 border-base-content/10 rounded-xl overflow-hidden bg-base-200/20">
        <svg
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseUp={(e) => handleMouseUp(e)}
          onMouseLeave={() => { setDragging(null); setWireStart(null); }}
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeOpacity="0.05" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Wires */}
          {circuitState.wires.map((wire) => {
            const fromComp = circuitState.components.find(c => c.id === wire.from.compId);
            const toComp = circuitState.components.find(c => c.id === wire.to.compId);
            if (!fromComp || !toComp) return null;
            
            const start = getTerminalPos(fromComp, wire.from.side);
            const end = getTerminalPos(toComp, wire.to.side);

            return (
              <line
                key={wire.id}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="#6366f1"
                strokeWidth="3"
                strokeLinecap="round"
              />
            );
          })}

          {/* Temporary wire being drawn */}
          {wireStart && (
            <line
              x1={getTerminalPos(circuitState.components.find(c => c.id === wireStart.compId), wireStart.side).x}
              y1={getTerminalPos(circuitState.components.find(c => c.id === wireStart.compId), wireStart.side).y}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke="#6366f1"
              strokeWidth="2"
              strokeDasharray="4"
              pointerEvents="none"
            />
          )}

          {/* Components */}
          {circuitState.components.map((comp) => (
            <g key={comp.id} transform={`translate(${comp.x}, ${comp.y})`}>
              <rect
                width={comp.width}
                height={comp.height}
                fill={comp.color}
                fillOpacity="0.2"
                stroke={comp.color}
                strokeWidth="2"
                rx="4"
                className="cursor-move"
                onMouseDown={(e) => handleMouseDown(e, comp, "component")}
                onMouseUp={(e) => handleMouseUp(e, comp, "component")}
              />
              <text
                x={comp.width / 2}
                y={comp.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fontWeight="bold"
                fill="currentColor"
                pointerEvents="none"
              >
                {comp.label}
              </text>

              {/* Terminals */}
              {["left", "right"].map((side) => {
                const pos = getTerminalPos({ x: 0, y: 0, width: comp.width, height: comp.height }, side);
                const isStart = wireStart && wireStart.compId === comp.id && wireStart.side === side;

                return (
                  <circle
                    key={side}
                    cx={pos.x}
                    cy={pos.y}
                    r="5"
                    fill={isStart ? "#fbbf24" : "currentColor"}
                    className="cursor-pointer hover:fill-primary transition-colors"
                    onMouseDown={(e) => handleMouseDown(e, { compId: comp.id, side }, "terminal")}
                    onMouseUp={(e) => handleMouseUp(e, { compId: comp.id, side }, "terminal")}
                  />
                );
              })}
            </g>
          ))}
        </svg>

        <div className="absolute bottom-4 left-4 p-2 bg-base-100/80 rounded-lg text-[10px] font-mono border border-base-content/10 backdrop-blur">
          <p>Components: {circuitState.components.length}</p>
          <p>Wires: {circuitState.wires.length}</p>
          {canWrite ? <p className="text-success">Write Access Granted</p> : <p className="text-warning">View Only Mode</p>}
        </div>
      </div>
    </div>
  );
};

export default CircuitSimulatorPanel;
