import { useCallback, useEffect, useState } from "react";

/**
 * Tiny fetch-on-mount helper for Supabase collections.
 * `fetcher` must resolve to `{ data, error }`.
 */
export default function useCollection(fetcher, deps = []) {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.resolve(fetcher())
      .then(({ data: rows, error: err }) => {
        if (!alive) return;
        setData(rows || []);
        setError(err || null);
      })
      .catch((err) => {
        if (alive) {
          setData([]);
          setError(err);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  return { data, error, loading, refetch, setData };
}
