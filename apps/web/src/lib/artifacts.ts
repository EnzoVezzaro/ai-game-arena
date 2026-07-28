import { useCallback, useEffect, useState } from 'react';

export type ArtifactType = 'plugin' | 'game' | 'arena';
export type ArtifactStatus = 'uploaded' | 'installed' | 'enabled' | 'disabled';

export interface Artifact {
  id: string;
  type: ArtifactType;
  slug: string;
  name: string;
  version: string;
  description: string | null;
  manifest: Record<string, unknown>;
  status: ArtifactStatus;
  path: string;
  published: boolean;
  published_at: number | null;
  published_by: string | null;
  created_at: number;
  updated_at: number;
}

const ENDPOINT = '/api/artifacts';

export function useArtifacts(type?: ArtifactType) {
  const [items, setItems] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const url = type ? `${ENDPOINT}?type=${type}` : ENDPOINT;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((list: Artifact[]) => setItems(list ?? []))
      .catch((err: Error) => {
        setError(err.message);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, refetch: load };
}

export function useArtifactActions(refetch: () => void) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(
    async (id: string, action: string, method: 'POST' | 'DELETE' = 'POST') => {
      setBusy(`${action}:${id}`);
      setError(null);
      try {
        const res = await fetch(`${ENDPOINT}/${id}/${action}`, { method });
        if (!res.ok) {
          const txt = await res.text().catch(() => res.statusText);
          throw new Error(txt || `HTTP ${res.status}`);
        }
        refetch();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [refetch],
  );

  const uploadZip = useCallback(
    async (type: ArtifactType, file: File): Promise<Artifact | null> => {
      setBusy('upload');
      setError(null);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`${ENDPOINT}/upload?type=${type}`, { method: 'POST', body: fd });
        if (!res.ok) {
          const txt = await res.text().catch(() => res.statusText);
          throw new Error(txt || `HTTP ${res.status}`);
        }
        const created = (await res.json()) as Artifact;
        refetch();
        return created;
      } catch (err) {
        setError((err as Error).message);
        return null;
      } finally {
        setBusy(null);
      }
    },
    [refetch],
  );

  const remove = useCallback(async (id: string) => call(id, '', 'DELETE'), [call]);

  return {
    busy,
    error,
    install: (id: string) => call(id, 'install'),
    uninstall: (id: string) => call(id, 'uninstall'),
    enable: (id: string) => call(id, 'enable'),
    disable: (id: string) => call(id, 'disable'),
    publish: (id: string) => call(id, 'publish'),
    unpublish: (id: string) => call(id, 'unpublish'),
    remove,
    uploadZip,
  };
}

/** Returns the next lifecycle action for a status (for the primary button label). */
export function nextLifecycleAction(status: ArtifactStatus, _published: boolean) {
  if (status === 'uploaded')
    return { label: 'Install', action: 'install' as const, icon: 'Download' };
  if (status === 'installed') return { label: 'Enable', action: 'enable' as const, icon: 'Power' };
  if (status === 'enabled')
    return { label: 'Disable', action: 'disable' as const, icon: 'PowerOff' };
  return { label: 'Enable', action: 'enable' as const, icon: 'Power' }; // disabled
}
