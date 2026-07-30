import React, { useEffect } from "react";
import Icon from "@/components/Icon";

export default function Modal({ open, onClose, title, sub, icon, accent = "#38bdf8", children, footer }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto scrollbar-thin glass-strong rounded-2xl border border-border shadow-2xl animate-slide-up">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/85 backdrop-blur px-5 py-4">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}1a`, border: `1px solid ${accent}40`, color: accent }}>
            <Icon name={icon || "PackagePlus"} size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-bold text-sm">{title}</h3>
            {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground"><Icon name="X" size={16} /></button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
        {footer && <div className="sticky bottom-0 border-t border-border bg-card/85 backdrop-blur px-5 py-3 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}