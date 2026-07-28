import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Icon } from '../../lib/Icon';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  sub?: string;
  icon?: string;
  accent?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  sub,
  icon = 'Plus',
  accent,
  children,
  footer,
}: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto scrollbar-thin glass-strong rounded-2xl border border-border shadow-2xl animate-fade-in">
        <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 border-b border-border glass-strong">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={
              accent
                ? { background: `${accent}1a`, border: `1px solid ${accent}40`, color: accent }
                : undefined
            }
          >
            <Icon name={icon} size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-sm">{title}</h3>
            {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60"
          >
            <Icon name="X" size={15} />
          </button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        {footer && (
          <div className="sticky bottom-0 px-5 py-3 border-t border-border glass-strong flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {hint && <span className="font-mono text-[9px] text-muted-foreground/70">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded-lg bg-input/60 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-colors';

interface InputProps {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
}

export function Input({ value, onChange, onBlur, placeholder, type = 'text' }: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className={inputCls}
    />
  );
}

interface TextAreaProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}

export function TextArea({ value, onChange, placeholder, rows = 3 }: TextAreaProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={cn(inputCls, 'resize-none')}
    />
  );
}

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}

export function Select({ value, onChange, options }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(inputCls, 'cursor-pointer')}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
