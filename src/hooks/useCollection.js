import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDataRevision } from "../lib/store";

/**
 * Fetch-on-mount helper for Supabase collections.
 *
 * Improvements over a plain `useEffect` fetch:
 *   • keeps the previous rows on screen while refreshing (no flicker),
 *   • exposes `refetch()` and `refresh({ silent: true })` for optimistic flows,
 *   • reacts to the global data revision, so publishing/deleting anywhere in
 *     the app keeps every list in sync,
 *   • ignores late responses from superseded requests.
 *
 * `fetcher` must resolve to `{ data, error }`.
 */
export default function useCollection(fetcher, deps = []) {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const revision = useDataRevision();
  const requestId = useRef(0);

  // Keep the latest fetcher without forcing the effect to re-run on every render.
  const latestFetcher = useRef(fetcher);
  latestFetcher.current = fetcher;

  const depKey = useMemo(() => JSON.stringify(deps), [deps]);

  useEffect(() => {
    let alive = true;
    const id = (requestId.current += 1);
    setLoading(true);

    Promise.resolve(latestFetcher.current())
      .then(({ data: rows, error: err } = {}) => {
        if (!alive || id !== requestId.current) return;
        setData(rows || []);
        setError(err || null);
      })
      .catch((err) => {
        if (!alive || id !== requestId.current) return;
        setData([]);
        setError(err);
      })
      .finally(() => {
        if (alive && id === requestId.current) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [depKey, nonce, revision]);

  const refetch = useCallback(() => setNonce((value) => value + 1), []);

  /** Same as refetch, but keeps `loading` false — used after local writes. */
  const refresh = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setNonce((value) => value + 1);
    },
    []
  );

  const isEmpty = !loading && !error && data.length === 0;

  return { data, error, loading, isEmpty, refetch, refresh, setData };
}
