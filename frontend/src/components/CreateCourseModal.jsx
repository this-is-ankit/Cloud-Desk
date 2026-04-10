import { useState } from "react";
import { SESSION_LANGUAGE_OPTIONS } from "../lib/sessionLanguage";
import { Loader2Icon, PlusCircleIcon, RadioTowerIcon, XIcon } from "./icons/ModernIcons";

const INITIAL_FORM = {
  title: "",
  code: "",
  category: "",
  level: "All Levels",
  language: "javascript",
  shortDescription: "",
  description: "",
  tags: "",
  persistentRoomEnabled: true,
  enrollmentMode: "open",
  inviteCode: "",
};

function CreateCourseModal({ isOpen, onClose, onSubmit, isSubmitting }) {
  const [form, setForm] = useState(INITIAL_FORM);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form, () => setForm(INITIAL_FORM));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="mx-auto my-8 w-full max-w-3xl rounded-[2rem] border border-base-content/10 bg-base-100 p-6 shadow-2xl md:p-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Teacher Workspace</p>
            <h2 className="mt-2 text-3xl font-black text-base-content">Create a live teaching course</h2>
            <p className="mt-2 max-w-2xl text-sm text-base-content/65">
              This creates a draft course for live teaching only. You can publish it after setting up classes, enrollment, and the persistent room.
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm btn-square rounded-xl" onClick={onClose} aria-label="Close create course modal">
            <XIcon className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="form-control">
              <span className="mb-2 text-sm font-medium">Course title</span>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                className="input input-bordered rounded-2xl"
                placeholder="Data Structures Masterclass"
                required
              />
            </label>
            <label className="form-control">
              <span className="mb-2 text-sm font-medium">Course code</span>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                className="input input-bordered rounded-2xl uppercase"
                placeholder="DSA401"
                required
              />
            </label>
            <label className="form-control">
              <span className="mb-2 text-sm font-medium">Subject / category</span>
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                className="input input-bordered rounded-2xl"
                placeholder="Computer Science"
                required
              />
            </label>
            <label className="form-control">
              <span className="mb-2 text-sm font-medium">Primary language</span>
              <select
                name="language"
                value={form.language}
                onChange={handleChange}
                className="select select-bordered rounded-2xl"
                required
              >
                {SESSION_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-control">
              <span className="mb-2 text-sm font-medium">Level</span>
              <select
                name="level"
                value={form.level}
                onChange={handleChange}
                className="select select-bordered rounded-2xl"
              >
                <option>All Levels</option>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </label>
            <label className="form-control">
              <span className="mb-2 text-sm font-medium">Discovery tags</span>
              <input
                name="tags"
                value={form.tags}
                onChange={handleChange}
                className="input input-bordered rounded-2xl"
                placeholder="dsa, graphs, interview prep"
              />
            </label>
            <label className="form-control">
              <span className="mb-2 text-sm font-medium">Enrollment mode</span>
              <select
                name="enrollmentMode"
                value={form.enrollmentMode}
                onChange={handleChange}
                className="select select-bordered rounded-2xl"
              >
                <option value="open">Open join</option>
                <option value="approval">Teacher approval</option>
                <option value="invite">Invite only</option>
              </select>
            </label>
            <label className="form-control">
              <span className="mb-2 text-sm font-medium">Invite code</span>
              <input
                name="inviteCode"
                value={form.inviteCode}
                onChange={handleChange}
                className="input input-bordered rounded-2xl uppercase"
                placeholder="Optional for invite-only courses"
              />
            </label>
          </div>

          <label className="form-control">
            <span className="mb-2 text-sm font-medium">Short description</span>
            <textarea
              name="shortDescription"
              value={form.shortDescription}
              onChange={handleChange}
              className="textarea textarea-bordered min-h-28 rounded-2xl"
              placeholder="What will students learn in these live classes?"
              maxLength={220}
              required
            />
            <span className="mt-2 text-xs text-base-content/55">{form.shortDescription.length}/220 characters</span>
          </label>

          <label className="form-control">
            <span className="mb-2 text-sm font-medium">Detailed description</span>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="textarea textarea-bordered min-h-36 rounded-2xl"
              placeholder="Describe the live teaching approach, cadence, expectations, and prerequisites."
            />
          </label>

          <label className="flex items-center gap-3 rounded-[1.5rem] border border-base-content/10 bg-base-200/40 p-4">
            <input
              type="checkbox"
              name="persistentRoomEnabled"
              checked={form.persistentRoomEnabled}
              onChange={handleChange}
              className="checkbox checkbox-primary"
            />
            <div>
              <p className="font-semibold">Enable a persistent course room</p>
              <p className="text-sm text-base-content/60">
                Recommended for office hours and ad hoc live teaching outside scheduled classes.
              </p>
            </div>
            <RadioTowerIcon className="ml-auto size-5 text-primary" />
          </label>

          <button type="submit" className="btn btn-primary rounded-2xl px-6" disabled={isSubmitting}>
            {isSubmitting ? <Loader2Icon className="size-4 animate-spin" /> : <PlusCircleIcon className="size-4" />}
            <span>{isSubmitting ? "Creating..." : "Create Draft Course"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateCourseModal;
