import { createStore, useStore } from "./store";

/**
 * Product Hunt-style upvote economy for project cards.
 *
 * Votes are a client-side overlay on top of the project's base score
 * (`project.upvotes`, falling back to a deterministic seed): the persisted
 * store only remembers *which* projects this browser has voted for, and the
 * displayed count is `base + (voted ? 1 : 0)`. That keeps the UI honest if
 * the server count moves, survives refresh via localStorage, and needs no
 * schema change — a future `project_upvotes` table can hydrate the same
 * store shape.
 */

const upvoteStore = createStore({ voted: {} }, { storageKey: "ph:hub:upvotes", merge: false });

/** Deterministic base score so rows without an `upvotes` column still rank. */
export function baseUpvotes(project = {}) {
  if (Number.isFinite(Number(project.upvotes))) return Number(project.upvotes);
  const seed = String(project.id || project.title || "");
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 13 + seed.charCodeAt(i)) % 997;
  return 18 + (hash % 220);
}

export function isUpvoted(id) {
  return Boolean(id && upvoteStore.get().voted[id]);
}

/** Toggles a vote; returns the new voted state. */
export function toggleUpvote(id) {
  if (!id) return false;
  const next = { ...upvoteStore.get().voted };
  if (next[id]) delete next[id];
  else next[id] = true;
  upvoteStore.set({ voted: next });
  return Boolean(next[id]);
}

export function clearUpvotes() {
  upvoteStore.set({ voted: {} });
}

/** Reactive view of the vote map: `{ [projectId]: true }`. */
export function useUpvotes() {
  return useStore(upvoteStore).voted;
}

/** Displayed score for one project given the current vote map. */
export function upvoteCount(project, votedMap = {}) {
  return baseUpvotes(project) + (votedMap[project?.id] ? 1 : 0);
}
