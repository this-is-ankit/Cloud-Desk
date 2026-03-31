import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAppUser } from "../hooks/useAppUser";
import { useUpdateProfile, useUpdateRole } from "../hooks/useUsers";

function ProfileSettingsPage() {
  const { profile } = useAppUser();
  const updateProfileMutation = useUpdateProfile();
  const updateRoleMutation = useUpdateRole();
  const [form, setForm] = useState({
    role: "student",
    headline: "",
    bio: "",
    subjects: "",
    languagesSpoken: "",
    availabilityNote: "",
    profileVisible: true,
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      role: profile.role,
      headline: profile.headline || "",
      bio: profile.bio || "",
      subjects: (profile.subjects || []).join(", "),
      languagesSpoken: (profile.languagesSpoken || []).join(", "),
      availabilityNote: profile.availabilityNote || "",
      profileVisible: profile.profileVisible !== false,
    });
  }, [profile]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <Navbar />
      <div className="mx-auto w-full max-w-5xl flex-grow px-4 py-10 md:px-6">
        <div className="rounded-[2rem] border border-base-content/10 bg-base-100 p-7">
          <h1 className="text-4xl font-black">Profile settings</h1>
          <p className="mt-3 text-base-content/65">Control your public role, teacher profile, and discoverability.</p>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <section className="space-y-4">
              <h2 className="text-xl font-bold">Role</h2>
              <select name="role" value={form.role} onChange={handleChange} className="select select-bordered rounded-2xl w-full">
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
              <button
                className="btn btn-primary rounded-2xl"
                onClick={() => updateRoleMutation.mutate({ role: form.role })}
                disabled={updateRoleMutation.isPending}
              >
                Save role
              </button>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold">Public profile</h2>
              <input name="headline" value={form.headline} onChange={handleChange} className="input input-bordered rounded-2xl w-full" placeholder="Headline" />
              <textarea name="bio" value={form.bio} onChange={handleChange} className="textarea textarea-bordered rounded-2xl min-h-28 w-full" placeholder="Bio" />
              <input name="subjects" value={form.subjects} onChange={handleChange} className="input input-bordered rounded-2xl w-full" placeholder="Subjects" />
              <input name="languagesSpoken" value={form.languagesSpoken} onChange={handleChange} className="input input-bordered rounded-2xl w-full" placeholder="Languages spoken" />
              <input name="availabilityNote" value={form.availabilityNote} onChange={handleChange} className="input input-bordered rounded-2xl w-full" placeholder="Availability" />
              <label className="flex items-center gap-3 rounded-2xl border border-base-content/10 bg-base-200/40 p-4">
                <input type="checkbox" name="profileVisible" checked={form.profileVisible} onChange={handleChange} className="checkbox checkbox-primary" />
                <span className="text-sm">Show my profile in teacher discovery</span>
              </label>
              <button
                className="btn btn-primary rounded-2xl"
                onClick={() =>
                  updateProfileMutation.mutate({
                    headline: form.headline,
                    bio: form.bio,
                    subjects: form.subjects,
                    languagesSpoken: form.languagesSpoken,
                    availabilityNote: form.availabilityNote,
                    profileVisible: form.profileVisible,
                  })
                }
                disabled={updateProfileMutation.isPending}
              >
                Save profile
              </button>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default ProfileSettingsPage;
