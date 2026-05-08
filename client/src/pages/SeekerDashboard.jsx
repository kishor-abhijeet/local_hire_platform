import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import EmptyState from "../components/EmptyState";
import JobCard from "../components/JobCard";
import LoadingSkeleton from "../components/LoadingSkeleton";
import StatusBadge from "../components/StatusBadge";
import { cities, experienceLevels } from "../data/options";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { csvToArray } from "../utils/format";

export default function SeekerDashboard() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    preferredCity: "",
    experienceLevel: "",
    skills: "",
    profileImage: null,
    resume: null
  });
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [profileResponse, applicationsResponse, savedJobsResponse] = await Promise.all([
        api.get("/users/profile"),
        api.get("/applications/me"),
        api.get("/saved-jobs/me")
      ]);

      const nextProfile = profileResponse.data.user;
      updateUser(nextProfile);
      setProfile({
        name: nextProfile.name || "",
        phone: nextProfile.phone || "",
        preferredCity: nextProfile.preferredCity || "",
        experienceLevel: nextProfile.experienceLevel || "",
        skills: (nextProfile.skills || []).join(", "),
        profileImage: null,
        resume: null
      });
      setApplications(applicationsResponse.data.applications);
      setSavedJobs(savedJobsResponse.data.savedJobs.map((item) => item.jobId).filter(Boolean));
    } catch (error) {
      toast.error("Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function updateField(key, value) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    const payload = new FormData();
    payload.append("name", profile.name);
    payload.append("phone", profile.phone);
    payload.append("preferredCity", profile.preferredCity);
    payload.append("experienceLevel", profile.experienceLevel);
    payload.append("skills", JSON.stringify(csvToArray(profile.skills)));
    if (profile.profileImage) payload.append("profileImage", profile.profileImage);
    if (profile.resume) payload.append("resume", profile.resume);

    setSaving(true);
    try {
      const { data } = await api.put("/users/profile", payload, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      updateUser(data.user);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function removeSaved(job) {
    try {
      await api.delete(`/saved-jobs/${job._id}`);
      toast.success("Removed from saved jobs");
      setSavedJobs((current) => current.filter((item) => item._id !== job._id));
    } catch (error) {
      toast.error("Unable to remove job");
    }
  }

  return (
    <section className="section-gap bg-neutral-50 dark:bg-neutral-950">
      <div className="page-shell">
        <div className="mb-8">
          <span className="pill mb-3 bg-white dark:bg-neutral-900">Job seeker dashboard</span>
          <h1 className="text-4xl font-black tracking-tight">Your job search hub</h1>
          <p className="mt-3 text-neutral-600 dark:text-neutral-300">
            Edit your profile, upload a resume, track applications, and revisit saved jobs.
          </p>
        </div>

        {loading ? (
          <LoadingSkeleton count={3} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <aside className="card h-fit p-5">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-lg bg-neutral-950 text-xl font-black text-white dark:bg-white dark:text-neutral-950">
                  {user?.profileImage?.url ? (
                    <img src={user.profileImage.url} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    user?.name?.charAt(0) || "U"
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-black">{user?.name}</h2>
                  <p className="text-sm text-neutral-500">{user?.email}</p>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="mt-6 grid gap-4">
                <div>
                  <label className="label">Name</label>
                  <input
                    className="input"
                    value={profile.name}
                    onChange={(event) => updateField("name", event.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    className="input"
                    value={profile.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Skills</label>
                  <input
                    className="input"
                    placeholder="Sales, driving, billing"
                    value={profile.skills}
                    onChange={(event) => updateField("skills", event.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Preferred city</label>
                  <select
                    className="input"
                    value={profile.preferredCity}
                    onChange={(event) => updateField("preferredCity", event.target.value)}
                  >
                    <option value="">Select city</option>
                    {cities.map((city) => (
                      <option key={city}>{city}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Experience level</label>
                  <select
                    className="input"
                    value={profile.experienceLevel}
                    onChange={(event) => updateField("experienceLevel", event.target.value)}
                  >
                    <option value="">Select experience</option>
                    {experienceLevels.map((level) => (
                      <option key={level}>{level}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Profile image</label>
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={(event) => updateField("profileImage", event.target.files[0])}
                  />
                </div>
                <div>
                  <label className="label">Resume</label>
                  <input
                    className="input"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(event) => updateField("resume", event.target.files[0])}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save profile"}
                </button>
              </form>
            </aside>

            <div className="grid gap-6">
              <div className="card p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-black">Applied jobs</h2>
                  <span className="pill">{applications.length} applications</span>
                </div>
                {applications.length ? (
                  <div className="grid gap-3">
                    {applications.map((application) => (
                      <div
                        key={application._id}
                        className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
                      >
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                          <div>
                            <p className="font-black">{application.jobId?.title}</p>
                            <p className="mt-1 text-sm text-neutral-500">
                              {application.jobId?.company} • {application.jobId?.city}
                            </p>
                          </div>
                          <StatusBadge status={application.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No applications yet" text="Apply to local jobs and track every status here." />
                )}
              </div>

              <div className="card p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-black">Saved jobs</h2>
                  <span className="pill">{savedJobs.length} saved</span>
                </div>
                {savedJobs.length ? (
                  <div className="grid gap-4">
                    {savedJobs.map((job) => (
                      <JobCard key={job._id} job={job} onSave={removeSaved} compact saveLabel="Remove" />
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No saved jobs" text="Save interesting jobs from the search page." />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
