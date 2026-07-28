import { useRef, useState } from 'react';
import { Modal } from './Modal';
import { Icon } from '../../lib/Icon';
import type { ArtifactType } from '../../lib/artifacts';

interface UploadZipModalProps {
  open: boolean;
  onClose: () => void;
  target: ArtifactType;
  onUpload: (file: File) => Promise<unknown>;
}

const TARGET_LABEL: Record<ArtifactType, string> = {
  plugin: 'Plugin',
  game: 'Game',
  arena: 'Arena',
};

const TARGET_HINT: Record<ArtifactType, string> = {
  plugin: 'A zip whose root or single subdirectory contains arena-plugin.json',
  game: 'A zip whose root or single subdirectory contains game.json (or arena-plugin.json)',
  arena: 'A zip whose root or single subdirectory contains arena-plugin.json',
};

export function UploadZipModal({ open, onClose, target, onUpload }: UploadZipModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setError(null);
    setDone(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleSubmit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await onUpload(file);
      setDone(true);
      reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Upload ${TARGET_LABEL[target]} (zip)`}
      sub={TARGET_HINT[target]}
      icon="Upload"
      accent="#34d399"
      footer={
        <>
          {error && <span className="text-xs text-destructive mr-auto">{error}</span>}
          {done && !error && (
            <span className="text-xs text-success mr-auto inline-flex items-center gap-1">
              <Icon name="Check" size={11} /> Uploaded
            </span>
          )}
          <button
            onClick={handleClose}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy || !file}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon
              name={busy ? 'Loader' : 'Upload'}
              size={14}
              className={busy ? 'animate-spin' : ''}
            />
            {busy ? 'Uploading…' : `Upload ${TARGET_LABEL[target]}`}
          </button>
        </>
      }
    >
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) setFile(f);
        }}
        className="rounded-xl border-2 border-dashed border-border bg-input/30 px-4 py-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <Icon name="FileArchive" size={28} className="mx-auto mb-2 text-muted-foreground" />
        {file ? (
          <div className="text-sm">
            <div className="font-medium text-foreground">{file.name}</div>
            <div className="text-[11px] text-muted-foreground font-mono">
              {(file.size / 1024).toFixed(1)} KB
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Drag a <span className="font-mono text-foreground/80">.zip</span> here, or click to
            browse
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFile(f);
          }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
        The zip must contain an <code>arena-plugin.json</code> (or <code>game.json</code>) at its
        root, or inside a single top-level subdirectory.
      </p>
    </Modal>
  );
}

export default UploadZipModal;
