import {
  CheckIcon,
  CodeIcon,
  EyeOffIcon,
  ListChecksIcon,
  LogOutIcon,
  PencilOffIcon,
  PresentationIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UserMinusIcon,
  WrenchIcon,
} from "./icons/ModernIcons";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

function HostToolsPopover({
  session,
  isAntiCheatEnabled,
  isCodeOpen,
  isWhiteboardOpen,
  whiteboardWriteMode,
  whiteboardWriterIds,
  onToggleAntiCheat,
  onToggleCodeSpace,
  onToggleWhiteboard,
  onWhiteboardWriteModeChange,
  onToggleWriterAccess,
  onToggleQuizPanel,
  onKickParticipant,
  onEndSession,
}) {
  const participants = session?.participants || [];
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const portalRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        ref.current &&
        !ref.current.contains(event.target) &&
        (!portalRef.current || !portalRef.current.contains(event.target))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + window.scrollY + 8, left: rect.right + window.scrollX - 320 });
  }, [isOpen]);

  useEffect(() => {
    portalRef.current = document.createElement("div");
    document.body.appendChild(portalRef.current);
    return () => {
      if (portalRef.current) {
        document.body.removeChild(portalRef.current);
      }
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`btn btn-sm btn-square rounded-xl ${isOpen ? "btn-primary" : "btn-ghost"}`}
        aria-label="Host tools"
        title="Host tools"
      >
        <WrenchIcon className="w-4 h-4" />
      </button>
      {isOpen && portalRef.current &&
        createPortal(
          <div
            style={{ top: coords.top, left: coords.left, position: "absolute" }}
            className="z-[120] w-80 rounded-2xl border border-base-content/10 bg-base-100 p-4 shadow-2xl"
          >
            <div className="space-y-3">
            <button onClick={onToggleQuizPanel} className="btn btn-sm btn-ghost w-full justify-start gap-2">
              <ListChecksIcon className="w-4 h-4" />
              Quiz
            </button>

            <button
              onClick={onToggleAntiCheat}
              className={`btn btn-sm w-full justify-start gap-2 ${isAntiCheatEnabled ? "btn-warning" : "btn-ghost"}`}
            >
              {isAntiCheatEnabled ? <ShieldAlertIcon className="w-4 h-4" /> : <ShieldCheckIcon className="w-4 h-4" />}
              {isAntiCheatEnabled ? "Disable Monitor" : "Enable Monitor"}
            </button>

            <button
              onClick={onToggleCodeSpace}
              className={`btn btn-sm w-full justify-start gap-2 ${isCodeOpen ? "btn-secondary" : "btn-ghost"}`}
            >
              {isCodeOpen ? <EyeOffIcon className="w-4 h-4" /> : <CodeIcon className="w-4 h-4" />}
              {isCodeOpen ? "Close Code Space" : "Open Code Space"}
            </button>

            <button
              onClick={onToggleWhiteboard}
              className={`btn btn-sm w-full justify-start gap-2 ${isWhiteboardOpen ? "btn-secondary" : "btn-ghost"}`}
            >
              <PresentationIcon className="w-4 h-4" />
              {isWhiteboardOpen ? "Close Whiteboard" : "Open Whiteboard"}
            </button>

            {isWhiteboardOpen && (
              <>
                <select className="select select-bordered select-sm w-full" value={whiteboardWriteMode} onChange={onWhiteboardWriteModeChange}>
                  <option value="host-only">Host writes</option>
                  <option value="approved">Approved writers</option>
                  <option value="all">Everyone writes</option>
                </select>

                <div className="rounded-lg border border-base-300 p-2">
                  <p className="mb-2 text-xs font-semibold uppercase text-base-content/60">Writer Access</p>
                  <div className="max-h-40 space-y-1 overflow-auto">
                    {participants.length ? (
                      participants.map((participant) => {
                        const hasWriteAccess = whiteboardWriterIds.includes(participant._id);
                        return (
                          <button
                            key={participant._id}
                            onClick={() => onToggleWriterAccess(participant._id, hasWriteAccess)}
                            className="btn btn-ghost btn-sm w-full justify-between"
                          >
                            <span className="truncate">{participant.name}</span>
                            {hasWriteAccess ? <CheckIcon className="w-4 h-4 text-success" /> : <PencilOffIcon className="w-4 h-4 opacity-60" />}
                          </button>
                        );
                      })
                    ) : (
                      <p className="px-2 py-1 text-xs opacity-70">No participants yet</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {participants.length > 0 && (
              <div className="rounded-lg border border-base-300 p-2">
                <p className="mb-2 text-xs font-semibold uppercase text-base-content/60">Participant Controls</p>
                <div className="max-h-36 space-y-1 overflow-auto">
                  {participants.map((p) => (
                    <button key={p._id} className="btn btn-ghost btn-sm w-full justify-start text-error gap-2" onClick={() => onKickParticipant(p._id)}>
                      <UserMinusIcon className="w-4 h-4" />
                      Kick {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={onEndSession} className="btn btn-error btn-sm w-full justify-start gap-2">
              <LogOutIcon className="w-4 h-4" />
              End Session
            </button>
          </div>
        </div>,
        portalRef.current
      )}
    </div>
  );
}

export default HostToolsPopover;
