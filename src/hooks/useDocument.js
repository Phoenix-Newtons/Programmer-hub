import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDataRevision } from "../lib/store";

/**
 * Single-row counterpart to `useCollection`: fetches one record, tracks the
 * loading/error state honestly (including "not found") and re-runs whenever the
 * global data revision changes.
 */
export default function useDocument(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const revision = useDataRevision();
  const requestId = useRef(0);

  const latestFetcher = useRef(fetcher);
  latestFetcher.current = fetcher;

  const depKey = useMemo(() => JSON.stringify(deps), [deps]);

  useEffect(() => {
    let alive = true;
    const id = (requestId.current += 1);
    setLoading(true);

    Promise.resolve(latestFetcher.current())
      .then(({ data: row, error: err } = {}) => {
        if (!alive || id !== requestId.current) return;
        setData(row || null);
        setError(err || null);
      })
      .catch((err) => {
        if (!alive || id !== requestId.current) return;
        setData(null);
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

  return { data, error, loading, notFound: !loading && !error && !data, refetch, setData };
}
