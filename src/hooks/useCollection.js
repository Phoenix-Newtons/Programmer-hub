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
  const mounted = useRef(true);

  // Keep the latest fetcher without forcing the effect to re-run on every render.
  const latestFetcher = useRef(fetcher);
  latestFetcher.current = fetcher;

  const depKey = useMemo(() => JSON.stringify(deps), [deps]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const id = (requestId.current += 1);
    setLoading(true);

    Promise.resolve(latestFetcher.current())
      .then(({ data: rows, error: err } = {}) => {
        if (id !== requestId.current) return;
        setData(rows || []);
        setError(err || null);
      })
      .catch((err) => {
        if (id !== requestId.current) return;
        setData([]);
        setError(err);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [depKey, nonce, revision]);

  const refetch = useCallback(() => setNonce((value) => value + 1), []);

  /**
   * Re-runs the fetcher.
   *   • `refetch()`                        → shows the loading state again
   *   • `await refresh({ silent: true })`  → swaps rows in place, no flicker
   *
   * Silent refreshes still own the request slot, so a slower in-flight request
   * can never overwrite their (newer) result.
   */
  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setNonce((value) => value + 1);
      return;
    }

    const id = (requestId.current += 1);
    try {
      const { data: rows, error: err } = (await latestFetcher.current()) || {};
      if (!mounted.current || id !== requestId.current) return;
      setData(rows || []);
      setError(err || null);
    } catch (err) {
      if (!mounted.current || id !== requestId.current) return;
      setError(err);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  const isEmpty = !loading && !error && data.length === 0;

  return { data, error, loading, isEmpty, refetch, refresh, setData };
}
