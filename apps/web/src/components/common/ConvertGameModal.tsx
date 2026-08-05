import { useRef, useState } from 'react';
import { Modal } from './Modal';
import { Icon } from '../../lib/Icon';

interface ConvertGameModalProps {
  open: boolean;
  onClose: () => void;
  onConvert: (file: File, format: string) => Promise<unknown>;
}

const FORMAT_OPTIONS = [
  { value: 'html', label: 'HTML5', description: 'Single-page web build' },
  { value: 'canvas', label: 'Canvas 2D', description: 'Pixel canvas with custom render loop' },
  { value: 'unity_webgl', label: 'Unity WebGL', description: 'Unity WebGL export' },
];


export function ConvertGameModal({ open, onClose, onConvert }: ConvertGameModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<string>('html');
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
    try {
      await onConvert(file, format);
      setDone(true);
      setTimeout(() => {
        onClose();
        reset();
      }, 1500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    onClose();
    reset();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Convert Game">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Icon name="RefreshCw" size={16} className="text-primary" />
          <h3 className="text-sm font-semibold">Convert Game</h3>
        </div>

        <p className="text-xs text-muted-foreground">
          Upload a .zip file containing the game source to convert it into a playable game.
        </p>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Target Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            {FORMAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Game Zip File</label>
          <input
            ref={inputRef}
            type="file"
            accept=".zip"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        {done && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-xs text-green-400">
            Game converted successfully!
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={handleClose}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-card"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 text-primary px-3 py-1.5 text-xs font-semibold hover:bg-primary/25 disabled:opacity-50"
          >
            <Icon name="RefreshCw" size={12} />
            {busy ? 'Converting…' : 'Convert'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ConvertGameModal;
