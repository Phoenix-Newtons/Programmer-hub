import { supabase } from "./supabase";
import { bumpData } from "./store";

/**
 * Data access layer — the only place that talks to Supabase.
 *
 * • Every read goes straight to your tables: there is no bundled sample data,
 *   so an empty project shows honest empty states instead of invented people.
 * • Successful writes bump the global data revision, which makes every
 *   mounted `useCollection` refresh itself.
 * • Reads retry once on flaky networks, then surface a friendly error.
 */

/** One retry with a short backoff, only for network-style failures. */
async function withRetry(run, attempts = 2) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const transient =
        error?.name === "TypeError" ||
        /failed to fetch|network|load failed|timeout|aborted/i.test(String(error?.message || ""));
      if (!transient || attempt === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  throw lastError;
}

/* ------------------------------------------------------------------ *
 * Profiles
 * ------------------------------------------------------------------ */
export async function fetchProfiles({ ids, limit } = {}) {
  // `ids: []` means "nothing requested" (the shortlist is empty) — not "everything".
  if (Array.isArray(ids)) {
    if (!ids.length) return { data: [], error: null };

    const { data, error } = await withRetry(() => supabase.from("profiles").select("*").in("id", ids));
    return { data: data || [], error };
  }

  let query = supabase
    .from("profiles")
    .select("*")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);

  const { data, error } = await withRetry(() => query);
  return { data: data || [], error };
}

export async function fetchProfile(id) {
  if (!id) return { data: null, error: new Error("Missing profile id.") };
  const { data, error } = await withRetry(() =>
    supabase.from("profiles").select("*").eq("id", id).maybeSingle()
  );
  return { data, error };
}

export async function saveProfile(profile) {
  const payload = { ...profile, updated_at: new Date().toISOString() };
  const { data, error } = await withRetry(() => supabase.from("profiles").upsert(payload).select().single());
  if (!error) bumpData();
  return { data, error };
}

export async function uploadAvatar(userId, file) {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
  if (uploadError) return { url: null, error: uploadError };
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { url: data?.publicUrl || null, error: null };
}

/* ------------------------------------------------------------------ *
 * Projects
 * ------------------------------------------------------------------ */
export async function fetchProjects({ category, userId, limit, featured } = {}) {
  let query = supabase.from("projects").select("*").order("created_at", { ascending: false });
  if (category && category !== "All") query = query.contains("tags", [category]);
  if (userId) query = query.eq("user_id", userId);
  if (featured) query = query.eq("featured", true);
  if (limit) query = query.limit(limit);

  const { data, error } = await withRetry(() => query);
  return { data: data || [], error };
}

export async function createProject(project) {
  const { data, error } = await withRetry(() => supabase.from("projects").insert(project).select().single());
  if (!error) bumpData();
  return { data, error };
}

export async function updateProject(id, project) {
  const { data, error } = await withRetry(() =>
    supabase.from("projects").update(project).eq("id", id).select().single()
  );
  if (!error) bumpData();
  return { data, error };
}

export async function deleteProject(id) {
  const { error } = await withRetry(() => supabase.from("projects").delete().eq("id", id));
  if (!error) bumpData();
  return { error };
}

/* ------------------------------------------------------------------ *
 * Jobs / hiring
 * ------------------------------------------------------------------ */
export async function fetchJobs({ userId, status, limit } = {}) {
  let query = supabase.from("jobs").select("*").order("created_at", { ascending: false });
  if (userId) query = query.eq("user_id", userId);
  if (status && status !== "all") query = query.eq("status", status);
  if (limit) query = query.limit(limit);

  const { data, error } = await withRetry(() => query);
  return { data: data || [], error };
}

export async function createJob(job) {
  const { data, error } = await withRetry(() => supabase.from("jobs").insert(job).select().single());
  if (!error) bumpData();
  return { data, error };
}

export async function updateJob(id, job) {
  const { data, error } = await withRetry(() =>
    supabase.from("jobs").update(job).eq("id", id).select().single()
  );
  if (!error) bumpData();
  return { data, error };
}

export async function deleteJob(id) {
  const { error } = await withRetry(() => supabase.from("jobs").delete().eq("id", id));
  if (!error) bumpData();
  return { error };
}

/* ------------------------------------------------------------------ *
 * Applications
 * ------------------------------------------------------------------ */

/**
 * Applications are readable by the role owner only (see supabase/schema.sql).
 * `jobIds` narrows the query so the dashboard only asks for its own roles.
 */
export async function fetchApplications({ jobIds, limit } = {}) {
  if (jobIds && !jobIds.length) return { data: [], error: null };

  let query = supabase.from("applications").select("*").order("created_at", { ascending: false });
  if (jobIds?.length) query = query.in("job_id", jobIds);
  if (limit) query = query.limit(limit);

  const { data, error } = await withRetry(() => query);
  return { data: data || [], error };
}

export async function createApplication(application) {
  const { data, error } = await withRetry(() =>
    supabase.from("applications").insert(application).select().single()
  );
  if (!error) bumpData();
  return { data, error };
}

export async function deleteApplication(id) {
  const { error } = await withRetry(() => supabase.from("applications").delete().eq("id", id));
  if (!error) bumpData();
  return { error };
}
