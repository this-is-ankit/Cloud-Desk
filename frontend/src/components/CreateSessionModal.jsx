import { LoaderIcon, PlusIcon, Users, User, XIcon } from "./icons/ModernIcons";
import { LANGUAGE_CONFIG } from "../data/problems"; 
import { useState } from "react";

function CreateSessionModal({ isOpen, onClose, onCreateRoom, isCreating }) {
  const [language, setLanguage] = useState("javascript");
  const [sessionType, setSessionType] = useState("one-on-one");
  const [maxParticipants, setMaxParticipants] = useState(5);

  if (!isOpen) return null;

  const handleCreate = () => {
    onCreateRoom({ 
      language, 
      sessionType, 
      maxParticipants: sessionType === "group" ? maxParticipants : 1 
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[2rem] border border-base-content/10 bg-base-100 p-6 shadow-2xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Study Room</p>
            <h3 className="mt-2 text-3xl font-black text-base-content">Create a live session</h3>
            <p className="mt-2 text-sm text-base-content/65">
              Start a focused coding room for one-on-one help or a small collaborative group.
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm btn-square rounded-xl" onClick={onClose} aria-label="Close create session modal">
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-base-content">Session type</label>
            <div className="flex gap-4">
              <button
                type="button"
                className={`btn flex-1 gap-2 rounded-xl ${sessionType === "one-on-one" ? "btn-primary" : "btn-outline border-base-content/15"}`}
                onClick={() => setSessionType("one-on-one")}
              >
                <User className="size-4" /> One-on-One
              </button>
              <button
                type="button"
                className={`btn flex-1 gap-2 rounded-xl ${sessionType === "group" ? "btn-primary" : "btn-outline border-base-content/15"}`}
                onClick={() => setSessionType("group")}
              >
                <Users className="size-4" /> Group
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-base-content">Coding language</label>
            <select
              className="select select-bordered h-12 w-full rounded-xl"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {Object.entries(LANGUAGE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.name}</option>
              ))}
            </select>
          </div>

          {sessionType === "group" && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-sm font-semibold text-base-content">Max participants (2-20)</label>
              <input
                type="number"
                min="2"
                max="20"
                className="input input-bordered h-12 w-full rounded-xl"
                value={maxParticipants}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 2 && value <= 20) {
                    setMaxParticipants(value);
                  }
                }}
              />
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button className="btn btn-ghost gap-2 rounded-xl" onClick={onClose}>
            <XIcon className="size-4" />
            Cancel
          </button>
          <button className="btn btn-primary gap-2 rounded-xl" onClick={handleCreate} disabled={isCreating}>
            {isCreating ? <LoaderIcon className="size-5 animate-spin" /> : <PlusIcon className="size-5" />}
            {isCreating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
export default CreateSessionModal;
