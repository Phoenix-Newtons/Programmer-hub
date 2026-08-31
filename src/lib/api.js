import { supabase } from "./supabase";
import { DEMO_JOBS, DEMO_PROJECTS, DEMO_PROFILES } from "./demoData";

/**
 * Opt-in sample data for design reviews: set VITE_DEMO_DATA=true in `.env.local`.
 * Off by default — the app always talks to Supabase unless you turn it on.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_DATA === "true";

const demoResult = (rows) => ({ data: rows, error: null });
const readOnlyError = () => ({
  data: null,
  error: new Error("Demo mode is read-only — enable Supabase to save changes."),
});

/* ----------------------------------------------------------------- *
 * Profiles
 * ----------------------------------------------------------------- */
export async function fetchProfiles() {
  if (DEMO_MODE) return demoResult(DEMO_PROFILES);
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });
  return { data: data || [], error };
}

export async function fetchProfile(id) {
  if (DEMO_MODE) return demoResult(DEMO_PROFILES.find((profile) => profile.id === id) || null);
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return { data, error };
}

export async function saveProfile(profile) {
  if (DEMO_MODE) return readOnlyError();
  const payload = { ...profile, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from("profiles").upsert(payload).select().single();
  return { data, error };
}

export async function uploadAvatar(userId, file) {
  if (DEMO_MODE) return { url: null, error: new Error("Demo mode is read-only — uploads are disabled.") };
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) return { url: null, error: uploadError };
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { url: data?.publicUrl || null, error: null };
}

/* ----------------------------------------------------------------- *
 * Projects
 * ----------------------------------------------------------------- */
export async function fetchProjects({ category } = {}) {
  if (DEMO_MODE) {
    const rows =
      !category || category === "All"
        ? DEMO_PROJECTS
        : DEMO_PROJECTS.filter((project) => (project.tags || []).includes(category));
    return demoResult(rows);
  }
  let query = supabase.from("projects").select("*").order("created_at", { ascending: false });
  if (category && category !== "All") query = query.contains("tags", [category]);
  const { data, error } = await query;
  return { data: data || [], error };
}

export async function createProject(project) {
  if (DEMO_MODE) return readOnlyError();
  const { data, error } = await supabase.from("projects").insert(project).select().single();
  return { data, error };
}

export async function deleteProject(id) {
  if (DEMO_MODE) return { error: new Error("Demo mode is read-only — deletions are disabled.") };
  const { error } = await supabase.from("projects").delete().eq("id", id);
  return { error };
}

/* ----------------------------------------------------------------- *
 * Jobs / hiring
 * ----------------------------------------------------------------- */
export async function fetchJobs() {
  if (DEMO_MODE) return demoResult(DEMO_JOBS);
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });
  return { data: data || [], error };
}

export async function createJob(job) {
  if (DEMO_MODE) return readOnlyError();
  const { data, error } = await supabase.from("jobs").insert(job).select().single();
  return { data, error };
}

export async function deleteJob(id) {
  if (DEMO_MODE) return { error: new Error("Demo mode is read-only — deletions are disabled.") };
  const { error } = await supabase.from("jobs").delete().eq("id", id);
  return { error };
}

/* ----------------------------------------------------------------- *
 * Applications (hiring page → developer)
 * ----------------------------------------------------------------- */
export async function createApplication(application) {
  if (DEMO_MODE) return readOnlyError();
  const { data, error } = await supabase.from("applications").insert(application).select().single();
  return { data, error };
}
