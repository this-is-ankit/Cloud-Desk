import { LoaderIcon, PlusIcon, Users, User } from "./icons/ModernIcons";
import { LANGUAGE_CONFIG } from "../data/problems"; 
import { useState } from "react";

function CreateSessionModal({ isOpen, onClose, onCreateRoom, isCreating }) {
  const [language, setLanguage] = useState("javascript");
  const [sessionType, setSessionType] = useState("one-on-one");
  const [maxParticipants, setMaxParticipants] = useState(5);

  if (!isOpen) return null;

  const handleCreate = () => {
    // Pass the new configuration to the creation handler
    onCreateRoom({ 
      language, 
      sessionType, 
      maxParticipants: sessionType === "group" ? maxParticipants : 1 
    });
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <h3 className="font-bold text-2xl mb-6">Create New Session</h3>

        <div className="space-y-6">
          {/* SESSION TYPE SELECTION */}
          <div className="space-y-2">
            <label className="label-text font-semibold">Session Type</label>
            <div className="flex gap-4">
              <button
                className={`btn flex-1 gap-2 ${sessionType === "one-on-one" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setSessionType("one-on-one")}
              >
                <User className="size-4" /> One-on-One
              </button>
              <button
                className={`btn flex-1 gap-2 ${sessionType === "group" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setSessionType("group")}
              >
                <Users className="size-4" /> Group
              </button>
            </div>
          </div>

          {/* LANGUAGE SELECTION */}
          <div className="space-y-2">
            <label className="label-text font-semibold">Select Language</label>
            <select
              className="select select-bordered w-full"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {Object.entries(LANGUAGE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.name}</option>
              ))}
            </select>
          </div>

          {/* MAX PARTICIPANTS (Only shown for Group) */}
          {sessionType === "group" && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="label-text font-semibold">Max Participants (2-20)</label>
              <input
                type="number"
                min="2"
                max="20"
                className="input input-bordered w-full"
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

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary gap-2" onClick={handleCreate} disabled={isCreating}>
            {isCreating ? <LoaderIcon className="size-5 animate-spin" /> : <PlusIcon className="size-5" />}
            {isCreating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
export default CreateSessionModal;