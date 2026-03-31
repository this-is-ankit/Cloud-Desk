import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router";
import { useCompleteOnboarding } from "../hooks/useUsers";

const INITIAL_FORM = {
  role: "teacher",
  headline: "",
  bio: "",
  subjects: "",
  languagesSpoken: "",
  availabilityNote: "",
  profileVisible: true,
};

function OnboardingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const completeOnboardingMutation = useCompleteOnboarding();

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    completeOnboardingMutation.mutate(form, {
      onSuccess: () => navigate("/dashboard"),
    });
  };

  return (
    <div className="min-h-screen bg-base-200 px-4 py-10">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-base-content/10 bg-base-100 p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Welcome to Cloud Desk</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Set up how you want to use the platform.</h1>
        <p className="mt-4 max-w-2xl text-base text-base-content/65">
          Choose whether you want to join as a teacher or a student. Teachers can immediately create live courses. Students can discover teachers and join live classes.
        </p>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                id: "teacher",
                title: "Teacher",
                copy: "Create live courses, schedule classes, and manage students.",
              },
              {
                id: "student",
                title: "Student",
                copy: "Discover teachers, join live classes, and track assignments.",
              },
            ].map((option) => (
              <label
                key={option.id}
                className={`cursor-pointer rounded-[1.75rem] border p-5 transition ${
                  form.role === option.id ? "border-primary bg-primary/5" : "border-base-content/10 bg-base-100"
                }`}
              >
                <input type="radio" name="role" value={option.id} checked={form.role === option.id} onChange={handleChange} className="sr-only" />
                <p className="text-xl font-black">{option.title}</p>
                <p className="mt-2 text-sm text-base-content/65">{option.copy}</p>
              </label>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="form-control">
              <span className="mb-2 text-sm font-medium">Headline</span>
              <input name="headline" value={form.headline} onChange={handleChange} className="input input-bordered rounded-2xl" placeholder="Frontend mentor, DSA coach, physics teacher" />
            </label>
            <label className="form-control">
              <span className="mb-2 text-sm font-medium">Availability note</span>
              <input name="availabilityNote" value={form.availabilityNote} onChange={handleChange} className="input input-bordered rounded-2xl" placeholder="Weeknights 7-10 PM IST" />
            </label>
          </div>

          <label className="form-control">
            <span className="mb-2 text-sm font-medium">Bio</span>
            <textarea name="bio" value={form.bio} onChange={handleChange} className="textarea textarea-bordered min-h-28 rounded-2xl" placeholder="Describe what you teach or what you want to learn." />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="form-control">
              <span className="mb-2 text-sm font-medium">Subjects</span>
              <input name="subjects" value={form.subjects} onChange={handleChange} className="input input-bordered rounded-2xl" placeholder="javascript, dsa, calculus" />
            </label>
            <label className="form-control">
              <span className="mb-2 text-sm font-medium">Languages spoken</span>
              <input name="languagesSpoken" value={form.languagesSpoken} onChange={handleChange} className="input input-bordered rounded-2xl" placeholder="English, Hindi" />
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-base-content/10 bg-base-200/40 p-4">
            <input type="checkbox" name="profileVisible" checked={form.profileVisible} onChange={handleChange} className="checkbox checkbox-primary" />
            <span className="text-sm">Make my profile discoverable in the public teacher directory</span>
          </label>

          <button type="submit" className="btn btn-primary rounded-2xl px-6" disabled={completeOnboardingMutation.isPending}>
            {completeOnboardingMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Continue to Workspace
          </button>
        </form>
      </div>
    </div>
  );
}

export default OnboardingPage;
