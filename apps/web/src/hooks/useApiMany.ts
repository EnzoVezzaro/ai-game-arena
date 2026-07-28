import { useEffect, useState, useCallback } from 'react';

/**
 * Fetch multiple endpoints in parallel and surface a single loading flag.
 * Returns arrays aligned to the endpoints in order (null on failure).
 */
export function useApiMany<T extends unknown[]>(
  endpoints: string[],
): {
  data: { [K in keyof T]: T[K] | null };
  loading: boolean;
  refetch: () => void;
} {
  const [data, setData] = useState<(T[number] | null)[]>(() => endpoints.map(() => null));
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let on = true;
    setLoading(true);
    Promise.all(
      endpoints.map((e) =>
        fetch(e)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    ).then((results) => {
      if (on) {
        setData(results);
        setLoading(false);
      }
    });
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, endpoints.join('|')]);

  return { data: data as { [K in keyof T]: T[K] | null }, loading, refetch };
}
