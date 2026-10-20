import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, SUPABASE_CONFIGURED } from "../lib/supabase";
import { bumpData } from "../lib/store";

/**
 * Real-time activity & state sync for the Hub dashboard.
 *
 * Architecture
 * ------------
 * One Supabase Realtime channel multiplexes `postgres_changes` listeners for
 * the three hub tables (`profiles`, `projects`, `jobs`). Every payload is
 * normalised into a small {@link HubActivity} record:
 *
 *   { id, table, eventType, message, icon, at, delta }
 *
 * - `message` is the human banner copy ("🚀 New project uploaded by Ada").
 * - `delta` is the optimistic sidebar-count adjustment (+1 / −1 / 0). Hub
 *   applies it immediately, then calls the existing data-revision bus
 *   (`bumpData`) so `useCollection` refetches and the real row lands in the
 *   grid — the optimistic delta is retired as soon as the fetched collection
 *   changes length, so counts never double.
 *
 * The hook is transport-agnostic for tests: pass any `client` with the
 * Supabase `channel().on().subscribe()` shape. With no network, no configured
 * project, or a failed handshake it degrades to `status: "offline"` and the
 * dashboard behaves exactly as before.
 *
 * @typedef {Object} HubActivity
 * @property {string} id
 * @property {"profiles"|"projects"|"jobs"} table
 * @property {"INSERT"|"UPDATE"|"DELETE"} eventType
 * @property {string} message
 * @property {"rocket"|"briefcase"|"sparkles"|"activity"} icon
 * @property {number} at        epoch milliseconds
 * @property {number} delta     optimistic count adjustment for the table
 */

export const HUB_TABLES = ["profiles", "projects", "jobs"];

/** Sidebar view id fed by each table. */
export const TABLE_VIEW = { profiles: "talent", projects: "projects", jobs: "jobs" };

function firstName(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

/**
 * Normalises a raw `postgres_changes` payload into banner copy + count delta.
 * Pure and exported so it can be unit-tested without a socket.
 *
 * @param {{table?: string, eventType?: string, new?: Object, old?: Object}} payload
 * @returns {HubActivity}
 */
export function describeHubEvent(payload = {}) {
  const table = HUB_TABLES.includes(payload.table) ? payload.table : "profiles";
  const eventType = ["INSERT", "UPDATE", "DELETE"].includes(payload.eventType) ? payload.eventType : "INSERT";
  const row = payload.new && Object.keys(payload.new).length ? payload.new : payload.old || {};
  const delta = eventType === "INSERT" ? 1 : eventType === "DELETE" ? -1 : 0;

  let message;
  let icon = "activity";
  if (table === "projects") {
    icon = "rocket";
    message =
      eventType === "INSERT"
        ? `🚀 New project uploaded by ${firstName(row.author_name, "a hub member")}`
        : eventType === "DELETE"
          ? `🗑️ A project was removed from the feed`
          : `✏️ “${firstName(row.title, "A project")}” was updated`;
  } else if (table === "jobs") {
    icon = "briefcase";
    const company = firstName(row.company, "A company");
    message =
      eventType === "INSERT"
        ? `💼 ${company} just posted a new role!`
        : eventType === "DELETE"
          ? `🗑️ ${company} removed a role`
          : `✏️ ${company} updated a role`;
  } else {
    icon = "sparkles";
    const name = firstName(row.name, "A developer");
    message =
      eventType === "INSERT"
        ? `✨ ${name} just joined the hub`
        : eventType === "DELETE"
          ? `👋 ${name} left the hub`
          : `🔄 ${name} updated their profile`;
  }

  return {
    id: `${table}-${eventType}-${row.id || "row"}-${Date.now()}`,
    table,
    eventType,
    message,
    icon,
    at: Date.now(),
    delta,
  };
}

/**
 * @param {string} [channelName]
 * @param {Object} [options]
 * @param {Object} [options.client]    Supabase-shaped client (injectable for tests)
 * @param {boolean} [options.enabled]
 * @param {number} [options.bannerMs]  how long the latest banner stays visible
 * @param {(activity: HubActivity) => void} [options.onActivity]
 * @returns {{ activity: HubActivity|null, activities: HubActivity[],
 *             status: "connecting"|"live"|"offline", deltas: Object,
 *             dismiss: () => void, retireDelta: (view: string) => void }}
 */
export default function useHubRealtime(
  channelName = "hub-live",
  { client = supabase, enabled = true, bannerMs = 6000, onActivity } = {}
) {
  const [activity, setActivity] = useState(null);
  const [activities, setActivities] = useState([]);
  const [status, setStatus] = useState("connecting");
  // Optimistic count adjustments per view id, retired once fresh rows arrive.
  const [deltas, setDeltas] = useState({ talent: 0, projects: 0, jobs: 0 });
  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;
  const bannerTimer = useRef(null);

  const dismiss = useCallback(() => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setActivity(null);
  }, []);

  /** Zeroes one view's optimistic delta — called after its refetch lands. */
  const retireDelta = useCallback((view) => {
    setDeltas((current) => (current[view] ? { ...current, [view]: 0 } : current));
  }, []);

  const handlePayload = useCallback(
    (payload) => {
      const next = describeHubEvent(payload);
      setActivity(next);
      setActivities((current) => [next, ...current].slice(0, 8));
      if (next.delta) {
        const view = TABLE_VIEW[next.table];
        setDeltas((current) => ({ ...current, [view]: (current[view] || 0) + next.delta }));
      }
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      if (bannerMs > 0) bannerTimer.current = setTimeout(() => setActivity(null), bannerMs);
      onActivityRef.current?.(next);
      // Refetch through the existing revision bus so the new row renders too;
      // Hub retires the optimistic delta when the collection length changes.
      bumpData();
    },
    [bannerMs]
  );

  useEffect(() => {
    if (!enabled || !SUPABASE_CONFIGURED || !client?.channel) {
      setStatus("offline");
      return undefined;
    }

    let channel;
    try {
      channel = client.channel(channelName);
      HUB_TABLES.forEach((table) => {
        channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, handlePayload);
      });
      // Also accept app-level broadcasts (e.g. a future edge function pinging
      // `hub-activity`) so the banner works before replication is enabled.
      channel = channel.on("broadcast", { event: "hub-activity" }, (message) =>
        handlePayload(message?.payload || {})
      );
      channel.subscribe((subscribeStatus) => {
        if (subscribeStatus === "SUBSCRIBED") setStatus("live");
        else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(subscribeStatus)) setStatus("offline");
      });
    } catch {
      setStatus("offline");
      return undefined;
    }

    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      try {
        client.removeChannel?.(channel);
      } catch {
        /* socket already gone */
      }
    };
  }, [channelName, client, enabled, handlePayload]);

  return { activity, activities, status, deltas, dismiss, retireDelta };
}
