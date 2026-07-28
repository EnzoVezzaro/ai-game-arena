import { useState } from 'react';
import { Icon } from '../../lib/Icon';
import { useArtifacts, useArtifactActions, type ArtifactType } from '../../lib/artifacts';
import { ArtifactCard } from './ArtifactCard';
import { UploadZipModal } from './UploadZipModal';

interface ArtifactSectionProps {
  type: ArtifactType;
  title: string;
  description: string;
}

export function ArtifactSection({ type, title, description }: ArtifactSectionProps) {
  const { items, loading, refetch } = useArtifacts(type);
  const actions = useArtifactActions(refetch);
  const [showUpload, setShowUpload] = useState(false);

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center gap-3">
        <Icon name="Layers" size={14} className="text-primary" />
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {title}
        </h2>
        <div className="h-px flex-1 bg-border" />
        <button
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 text-primary px-3 py-1.5 text-[11px] font-semibold hover:bg-primary/25"
        >
          <Icon name="Upload" size={12} /> Upload zip
        </button>
      </div>

      <p className="text-xs text-muted-foreground mb-3">{description}</p>

      {loading ? (
        <div className="text-xs text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-muted-foreground text-sm">
          No uploaded artifacts yet. Upload a zip to stage one.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((a) => (
            <ArtifactCard key={a.id} artifact={a} actions={actions} />
          ))}
        </div>
      )}

      <UploadZipModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        target={type}
        onUpload={(file) => actions.uploadZip(type, file)}
      />
    </section>
  );
}

export default ArtifactSection;
