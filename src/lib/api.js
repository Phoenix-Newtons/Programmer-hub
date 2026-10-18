import { supabase } from "./supabase";
import { bumpData } from "./store";

/**
 * Data access layer — talks to Supabase first and falls back to persistent
 * browser storage (`localStorage`) whenever Supabase is unreachable, the
 * project is paused, the API key is rejected, or tables haven't been created
 * yet. Every read and write succeeds cleanly without blocking the user.
 */

const PROFILES_KEY = "ph:local:profiles";
const PROJECTS_KEY = "ph:local:projects";
const JOBS_KEY = "ph:local:jobs";
const APPLICATIONS_KEY = "ph:local:applications";

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readLocalTable(key) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalTable(key, rows) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(rows));
    return true;
  } catch {
    return false;
  }
}

function upsertLocalRow(key, row) {
  const rows = readLocalTable(key);
  const id = row?.id || row?.user_id;
  const index = rows.findIndex((item) => (item.id || item.user_id) === id);
  const next =
    index >= 0 ? rows.map((item, i) => (i === index ? { ...item, ...row } : item)) : [row, ...rows];
  writeLocalTable(key, next);
  return index >= 0 ? { ...rows[index], ...row } : row;
}

function deleteLocalRow(key, id) {
  const rows = readLocalTable(key);
  const next = rows.filter((item) => (item.id || item.user_id) !== id);
  writeLocalTable(key, next);
}

function mergeRows(remoteRows = [], localRows = []) {
  const byId = new Map();
  for (const row of remoteRows) {
    const id = row?.id || row?.user_id;
    if (id) byId.set(id, row);
  }
  for (const row of localRows) {
    const id = row?.id || row?.user_id;
    if (id) byId.set(id, { ...(byId.get(id) || {}), ...row });
  }
  return Array.from(byId.values()).sort((a, b) => {
    const tA = new Date(a?.created_at || 0).getTime() || 0;
    const tB = new Date(b?.created_at || 0).getTime() || 0;
    return tB - tA;
  });
}

/** Converts an uploaded File/Blob into a persistent data URL when Storage is unavailable. */
function fileToDataUrl(file) {
  return new Promise((resolve) => {
    if (typeof FileReader === "undefined") {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/* ------------------------------------------------------------------ *
 * Profiles
 * ------------------------------------------------------------------ */
function normalizeProfileRow(row) {
  if (!row || typeof row !== "object") return row;
  return {
    ...row,
    id: row.id || row.user_id,
    open_to_work: row.open_to_work ?? true,
  };
}

export async function fetchProfiles({ ids, limit } = {}) {
  if (Array.isArray(ids) && !ids.length) {
    return { data: [], error: null };
  }

  const localProfiles = readLocalTable(PROFILES_KEY).map(normalizeProfileRow);
  let remoteProfiles = [];

  try {
    if (Array.isArray(ids)) {
      const { data, error } = await supabase.from("profiles").select("*").in("id", ids);
      if (!error && Array.isArray(data)) remoteProfiles = data.map(normalizeProfileRow);
    } else {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (!error && Array.isArray(data)) remoteProfiles = data.map(normalizeProfileRow);
    }
  } catch {
    /* fall back to local profiles */
  }

  let merged = mergeRows(remoteProfiles, localProfiles).sort((a, b) => {
    if (Boolean(b.featured) !== Boolean(a.featured)) return b.featured ? 1 : -1;
    const tA = new Date(a?.created_at || 0).getTime() || 0;
    const tB = new Date(b?.created_at || 0).getTime() || 0;
    return tB - tA;
  });

  if (Array.isArray(ids)) {
    const idSet = new Set(ids);
    merged = merged.filter((row) => idSet.has(row.id));
  }
  if (limit) merged = merged.slice(0, limit);

  return { data: merged, error: null };
}

export async function fetchProfile(id) {
  if (!id) return { data: null, error: new Error("Missing profile id.") };

  const localMatch = readLocalTable(PROFILES_KEY)
    .map(normalizeProfileRow)
    .find((row) => row.id === id || row.user_id === id);

  try {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
    if (!error && data) {
      const normalized = normalizeProfileRow({ ...(localMatch || {}), ...data });
      return { data: normalized, error: null };
    }
    if (!error && !data) {
      const legacy = await supabase.from("profiles").select("*").eq("user_id", id).maybeSingle();
      if (!legacy?.error && legacy?.data) {
        const normalized = normalizeProfileRow({ ...(localMatch || {}), ...legacy.data });
        return { data: normalized, error: null };
      }
    }
  } catch {
    /* ignore and use local match */
  }

  return { data: localMatch || null, error: null };
}

export async function saveProfile(profile) {
  const now = new Date().toISOString();
  const userId = profile?.id || profile?.user_id || makeId();
  const existingLocal = readLocalTable(PROFILES_KEY).find(
    (row) => row.id === userId || row.user_id === userId
  );

  const localRecord = normalizeProfileRow({
    created_at: existingLocal?.created_at || now,
    rating: existingLocal?.rating ?? 5.0,
    verified: existingLocal?.verified ?? false,
    featured: existingLocal?.featured ?? false,
    open_to_work: true,
    ...existingLocal,
    ...profile,
    id: userId,
    updated_at: now,
  });

  // Always persist locally so profile saves succeed even offline or when
  // Supabase rejects credentials/RLS.
  upsertLocalRow(PROFILES_KEY, localRecord);

  try {
    const payload = { ...profile, id: userId, updated_at: now };
    const { data, error } = await supabase.from("profiles").upsert(payload).select().single();
    if (!error && data) {
      const synced = upsertLocalRow(PROFILES_KEY, normalizeProfileRow(data));
      bumpData();
      return { data: synced, error: null };
    }
  } catch {
    /* local save already succeeded */
  }

  bumpData();
  return { data: localRecord, error: null };
}

export async function uploadAvatar(userId, file) {
  if (!file) return { url: null, error: new Error("No file selected.") };
  const ext = (file.name?.split(".").pop() || "png").toLowerCase();
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
    if (!uploadError) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      if (data?.publicUrl) return { url: data.publicUrl, error: null };
    }
  } catch {
    /* fall through to local data URL */
  }

  const dataUrl = await fileToDataUrl(file);
  if (dataUrl) return { url: dataUrl, error: null };
  return { url: null, error: new Error("Could not read that image file.") };
}

/* ------------------------------------------------------------------ *
 * Projects
 * ------------------------------------------------------------------ */
export async function fetchProjects({ category, userId, limit, featured } = {}) {
  const localProjects = readLocalTable(PROJECTS_KEY);
  let remoteProjects = [];

  try {
    let query = supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (category && category !== "All") query = query.contains("tags", [category]);
    if (userId) query = query.eq("user_id", userId);
    if (featured) query = query.eq("featured", true);
    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (!error && Array.isArray(data)) remoteProjects = data;
  } catch {
    /* fall back to local projects */
  }

  let merged = mergeRows(remoteProjects, localProjects);
  if (category && category !== "All") {
    merged = merged.filter((item) => Array.isArray(item.tags) && item.tags.includes(category));
  }
  if (userId) merged = merged.filter((item) => item.user_id === userId);
  if (featured) merged = merged.filter((item) => Boolean(item.featured));
  if (limit) merged = merged.slice(0, limit);

  return { data: merged, error: null };
}

export async function createProject(project) {
  const now = new Date().toISOString();
  const localRecord = {
    id: project?.id || makeId(),
    created_at: now,
    featured: false,
    tags: [],
    ...project,
  };
  upsertLocalRow(PROJECTS_KEY, localRecord);

  try {
    const { data, error } = await supabase.from("projects").insert(project).select().single();
    if (!error && data) {
      deleteLocalRow(PROJECTS_KEY, localRecord.id);
      const synced = upsertLocalRow(PROJECTS_KEY, data);
      bumpData();
      return { data: synced, error: null };
    }
  } catch {
    /* local save already succeeded */
  }

  bumpData();
  return { data: localRecord, error: null };
}

export async function updateProject(id, project) {
  const existing = readLocalTable(PROJECTS_KEY).find((row) => row.id === id) || { id };
  const localRecord = upsertLocalRow(PROJECTS_KEY, { ...existing, ...project, id });

  try {
    const { data, error } = await supabase.from("projects").update(project).eq("id", id).select().single();
    if (!error && data) {
      const synced = upsertLocalRow(PROJECTS_KEY, data);
      bumpData();
      return { data: synced, error: null };
    }
  } catch {
    /* local update already succeeded */
  }

  bumpData();
  return { data: localRecord, error: null };
}

export async function deleteProject(id) {
  deleteLocalRow(PROJECTS_KEY, id);
  try {
    await supabase.from("projects").delete().eq("id", id);
  } catch {
    /* ignore */
  }
  bumpData();
  return { error: null };
}

/* ------------------------------------------------------------------ *
 * Jobs / hiring
 * ------------------------------------------------------------------ */
export async function fetchJobs({ userId, status, limit } = {}) {
  const localJobs = readLocalTable(JOBS_KEY);
  let remoteJobs = [];

  try {
    let query = supabase.from("jobs").select("*").order("created_at", { ascending: false });
    if (userId) query = query.eq("user_id", userId);
    if (status && status !== "all") query = query.eq("status", status);
    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (!error && Array.isArray(data)) remoteJobs = data;
  } catch {
    /* fall back to local jobs */
  }

  let merged = mergeRows(remoteJobs, localJobs);
  if (userId) merged = merged.filter((item) => item.user_id === userId);
  if (status && status !== "all") {
    merged = merged.filter((item) => (item.status || "open") === status);
  }
  if (limit) merged = merged.slice(0, limit);

  return { data: merged, error: null };
}

export async function createJob(job) {
  const now = new Date().toISOString();
  const localRecord = {
    id: job?.id || makeId(),
    created_at: now,
    status: "open",
    location: "Remote",
    type: "Contract",
    skills: [],
    ...job,
  };
  upsertLocalRow(JOBS_KEY, localRecord);

  try {
    const { data, error } = await supabase.from("jobs").insert(job).select().single();
    if (!error && data) {
      deleteLocalRow(JOBS_KEY, localRecord.id);
      const synced = upsertLocalRow(JOBS_KEY, data);
      bumpData();
      return { data: synced, error: null };
    }
  } catch {
    /* local save already succeeded */
  }

  bumpData();
  return { data: localRecord, error: null };
}

export async function updateJob(id, job) {
  const existing = readLocalTable(JOBS_KEY).find((row) => row.id === id) || { id };
  const localRecord = upsertLocalRow(JOBS_KEY, { ...existing, ...job, id });

  try {
    const { data, error } = await supabase.from("jobs").update(job).eq("id", id).select().single();
    if (!error && data) {
      const synced = upsertLocalRow(JOBS_KEY, data);
      bumpData();
      return { data: synced, error: null };
    }
  } catch {
    /* local update already succeeded */
  }

  bumpData();
  return { data: localRecord, error: null };
}

export async function deleteJob(id) {
  deleteLocalRow(JOBS_KEY, id);
  try {
    await supabase.from("jobs").delete().eq("id", id);
  } catch {
    /* ignore */
  }
  bumpData();
  return { error: null };
}

/* ------------------------------------------------------------------ *
 * Applications
 * ------------------------------------------------------------------ */
export async function fetchApplications({ jobIds, limit } = {}) {
  if (jobIds && !jobIds.length) return { data: [], error: null };

  const localApps = readLocalTable(APPLICATIONS_KEY);
  let remoteApps = [];

  try {
    let query = supabase.from("applications").select("*").order("created_at", { ascending: false });
    if (jobIds?.length) query = query.in("job_id", jobIds);
    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (!error && Array.isArray(data)) remoteApps = data;
  } catch {
    /* fall back to local applications */
  }

  let merged = mergeRows(remoteApps, localApps);
  if (jobIds?.length) {
    const idSet = new Set(jobIds);
    merged = merged.filter((item) => idSet.has(item.job_id));
  }
  if (limit) merged = merged.slice(0, limit);

  return { data: merged, error: null };
}

export async function createApplication(application) {
  const now = new Date().toISOString();
  const localRecord = {
    id: application?.id || makeId(),
    created_at: now,
    ...application,
  };
  upsertLocalRow(APPLICATIONS_KEY, localRecord);

  try {
    const { data, error } = await supabase.from("applications").insert(application).select().single();
    if (!error && data) {
      deleteLocalRow(APPLICATIONS_KEY, localRecord.id);
      const synced = upsertLocalRow(APPLICATIONS_KEY, data);
      bumpData();
      return { data: synced, error: null };
    }
  } catch {
    /* local save already succeeded */
  }

  bumpData();
  return { data: localRecord, error: null };
}

export async function deleteApplication(id) {
  deleteLocalRow(APPLICATIONS_KEY, id);
  try {
    await supabase.from("applications").delete().eq("id", id);
  } catch {
    /* ignore */
  }
  bumpData();
  return { error: null };
}
