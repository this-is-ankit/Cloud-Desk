import { Code2Icon, LoaderIcon, PlusIcon } from "lucide-react";
import { LANGUAGE_CONFIG } from "../data/problems"; 
import { useState } from "react";

function CreateSessionModal({ isOpen, onClose, onCreateRoom, isCreating }) {
  const [language, setLanguage] = useState("javascript");

  if (!isOpen) return null;

  const handleCreate = () => {
    onCreateRoom({ language });
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <h3 className="font-bold text-2xl mb-6">Create New Session</h3>

        <div className="space-y-8">
          {/* LANGUAGE SELECTION */}
          <div className="space-y-2">
            <label className="label">
              <span className="label-text font-semibold">Select Language</span>
              <span className="label-text-alt text-error">*</span>
            </label>

            <select
              className="select w-full"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {Object.entries(LANGUAGE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>

          <button
            className="btn btn-primary gap-2"
            onClick={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? (
              <LoaderIcon className="size-5 animate-spin" />
            ) : (
              <PlusIcon className="size-5" />
            )}
            {isCreating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
export default CreateSessionModal;