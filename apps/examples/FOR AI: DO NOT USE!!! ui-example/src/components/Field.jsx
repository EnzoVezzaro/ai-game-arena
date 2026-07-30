import React from "react";
import { cn } from "@/lib/utils";

export function Field({ label, hint, children, className }) {
  return (
    <div className={className}>
      {label && <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>}
      {children}
      {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Input({ value, onChange, placeholder, type = "text", ...rest }) {
  return (
    <input
      type={type} value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder}
      className="mt-1.5 w-full rounded-lg bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
      {...rest}
    />
  );
}

export function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} rows={rows}
      className="mt-1.5 w-full rounded-lg bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors resize-none"
    />
  );
}

export function Select({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value} onChange={e => onChange?.(e.target.value)}
      className="mt-1.5 w-full rounded-lg bg-input border border-border px-3 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function ChipToggle({ active, onClick, label, icon, color }) {
  return (
    <button
      onClick={onClick}
      className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all",
        active ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card/40 text-muted-foreground hover:text-foreground")}
      style={active && color ? { color, borderColor: `${color}55`, background: `${color}14` } : undefined}
    >
      {icon && <span style={{ color: color || undefined }}><span className="inline-flex">{icon}</span></span>}
      {label}
    </button>
  );
}