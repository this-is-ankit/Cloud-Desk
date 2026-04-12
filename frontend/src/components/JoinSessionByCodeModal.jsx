import { useState } from "react";
import { KeyIcon, Loader2Icon, XIcon } from "./icons/ModernIcons";

function JoinSessionByCodeModal({ isOpen, onClose, onJoin, isJoining }) {
  const [code, setCode] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    onJoin(code.trim().toUpperCase(), () => {
      setCode("");
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-base-content/10 bg-base-100 p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Live Access
            </p>
            <h2 className="mt-2 text-2xl font-black text-base-content">
              Join a study room
            </h2>
            <p className="mt-2 text-sm text-base-content/65">
              Enter the room code shared by the host to join the active live
              session.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square rounded-xl"
            onClick={onClose}
            aria-label="Close join session modal"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="form-control">
            <span className="mb-2 text-sm font-medium text-base-content/80">
              Access code
            </span>
            <div className="relative">
              <KeyIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-base-content/40" />
              <input
                type="text"
                className="input input-bordered h-12 w-full rounded-2xl pl-11 font-mono uppercase tracking-[0.22em]"
                placeholder="ABC123"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                required
              />
            </div>
          </label>

          <button
            type="submit"
            className="btn btn-primary w-full rounded-2xl"
            disabled={isJoining}
          >
            {isJoining ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <KeyIcon className="size-4" />
            )}
            <span>{isJoining ? "Joining..." : "Join session"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default JoinSessionByCodeModal;
