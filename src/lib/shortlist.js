import { createStore, useStore } from "./store";

/**
 * Shortlist — the hirer's private saved-developer list.
 *
 * It lives in `localStorage` only (no account needed, nothing leaves the
 * browser) and keeps a small snapshot of each saved profile so the list still
 * renders if Supabase is unreachable. Snapshots are refreshed whenever the
 * live profile is available.
 */

const EMPTY = { ids: [], items: {} };

export const shortlistStore = createStore(EMPTY, { storageKey: "ph:shortlist" });

/** Reduces a profile row to the fields the shortlist page needs. */
export function toEntry(profile = {}) {
  return {
    id: profile.id,
    name: profile.name || profile.author_name || "Unnamed developer",
    title: profile.title || "",
    location: profile.location || "",
    avatar_url: profile.avatar_url || "",
    skills: Array.isArray(profile.skills) ? profile.skills.slice(0, 12) : [],
    hourly_rate: profile.hourly_rate || "",
    rating: Number(profile.rating) || 0,
    open_to_work: Boolean(profile.open_to_work),
    email: profile.email || "",
    whatsapp: profile.whatsapp || "",
    saved_at: new Date().toISOString(),
  };
}

/** Pure state transition — also used by the unit tests. */
export function addEntry(state, entry) {
  if (!entry?.id) return state;
  const existing = state.items[entry.id];
  return {
    ids: existing ? state.ids : [entry.id, ...state.ids],
    items: { ...state.items, [entry.id]: { ...existing, ...entry } },
  };
}

export function removeEntry(state, id) {
  if (!state.items[id]) return state;
  const items = { ...state.items };
  delete items[id];
  return { ids: state.ids.filter((value) => value !== id), items };
}

/* ------------------------------------------------------------------ *
 * Store API
 * ------------------------------------------------------------------ */
export function getShortlistIds() {
  return shortlistStore.get().ids;
}

export function isShortlisted(id) {
  return Boolean(id) && Boolean(shortlistStore.get().items[id]);
}

/** Adds the profile or removes it when already saved. Returns the new state. */
export function toggleShortlist(profile) {
  const { items } = shortlistStore.get();
  return items[profile?.id] ? removeShortlist(profile.id) : saveToShortlist(profile);
}

export function saveToShortlist(profile) {
  return shortlistStore.set((state) => addEntry(state, toEntry(profile)));
}

export function removeShortlist(id) {
  return shortlistStore.set((state) => removeEntry(state, id));
}

export function clearShortlist() {
  return shortlistStore.set(EMPTY);
}

/** Refreshes stored snapshots with fresh rows (called once profiles load). */
export function syncShortlist(profiles = []) {
  if (!profiles.length) return;
  shortlistStore.set((state) => {
    if (!state.ids.length) return state;
    let changed = false;
    const items = { ...state.items };
    for (const profile of profiles) {
      const existing = items[profile.id];
      if (!existing) continue;
      const fresh = { ...toEntry(profile), saved_at: existing.saved_at };
      if (JSON.stringify(fresh) !== JSON.stringify(existing)) {
        items[profile.id] = fresh;
        changed = true;
      }
    }
    return changed ? { ...state, items } : state;
  });
}

/* ------------------------------------------------------------------ *
 * Bulk contact helpers
 * ------------------------------------------------------------------ */

/**
 * Every usable email address on the list: trimmed, lower-cased and deduped.
 * Order follows the shortlist, so the first saved developer comes first.
 */
export function getShortlistEmails(items = []) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const email = String(item?.email || "").trim();
    const key = email.toLowerCase();
    if (!email || seen.has(key)) continue;
    seen.add(key);
    out.push(email);
  }
  return out;
}

/**
 * WhatsApp numbers on the list, normalised to digits (wa.me format).
 * Contacts are only useful with a country code, so short numbers are skipped.
 */
export function getShortlistWhatsApps(items = []) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const digits = String(item?.whatsapp || "").replace(/\D/g, "");
    if (digits.length < 8 || seen.has(digits)) continue;
    seen.add(digits);
    out.push(digits);
  }
  return out;
}

/** A ready-to-click `mailto:` draft addressed to the whole shortlist. */
export function shortlistMailto(items = [], subject = "Project enquiry from Programmer's Hub") {
  const emails = getShortlistEmails(items);
  if (!emails.length) return "";
  return `mailto:${emails.join(",")}?subject=${encodeURIComponent(subject)}`;
}

/* ------------------------------------------------------------------ *
 * React bindings
 * ------------------------------------------------------------------ */
export function useShortlist() {
  const state = useStore(shortlistStore);
  return {
    ids: state.ids,
    items: state.items,
    count: state.ids.length,
    list: state.ids.map((id) => state.items[id]).filter(Boolean),
    has: (id) => Boolean(state.items[id]),
    toggle: toggleShortlist,
    save: saveToShortlist,
    remove: removeShortlist,
    clear: clearShortlist,
  };
}
