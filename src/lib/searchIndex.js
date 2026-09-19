import { fetchJobs, fetchProfiles, fetchProjects } from "./api";
import { getDataRevision } from "./store";

/**
 * Lazily-built, revision-aware cache of everything the command palette
 * searches. It is only fetched the first time the palette opens (or after any
 * write bumps the data revision), so it never competes with page loads.
 */
let cache = null;
let cachedRevision = -1;
let inflight = null;

export function getCachedSearchIndex() {
  return cache;
}

export function invalidateSearchIndex() {
  cachedRevision = -1;
}

export async function loadSearchIndex({ force = false } = {}) {
  const revision = getDataRevision();
  if (!force && cache && cachedRevision === revision) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    const [profiles, projects, jobs] = await Promise.all([fetchProfiles(), fetchProjects(), fetchJobs()]);

    cache = {
      developers: profiles.data || [],
      projects: projects.data || [],
      jobs: jobs.data || [],
      error: profiles.error || projects.error || jobs.error || null,
      loadedAt: Date.now(),
    };
    cachedRevision = revision;
    inflight = null;
    return cache;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
