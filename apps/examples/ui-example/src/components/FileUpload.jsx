const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from "react";

import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";

export default function FileUpload({ label = "Upload bundle", accept, value, onChange, hint, accent = "#38bdf8" }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const handle = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true); setErr("");
    try {
      const res = await db.integrations.Core.UploadFile({ file: f });
      onChange?.(res?.file_url || "");
    } catch {
      setErr("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const filename = value ? value.split("/").pop().split("?")[0] : "";

  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
      <div className="mt-1.5 rounded-xl border border-dashed border-border bg-card/40 px-3 py-3">
        <input type="file" accept={accept} onChange={handle} disabled={uploading} className="hidden" id="fileup" />
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}1a`, color: accent, border: `1px solid ${accent}40` }}>
            <Icon name={uploading ? "Activity" : "FileUp"} size={16} className={uploading ? "animate-spin" : ""} />
          </div>
          <div className="min-w-0 flex-1">
            {uploading ? (
              <div className="text-xs text-muted-foreground">Uploading bundle…</div>
            ) : value ? (
              <div className="min-w-0">
                <div className="text-xs font-medium truncate flex items-center gap-1.5">
                  <Icon name="Check" size={12} className="text-success shrink-0" />
                  <span className="truncate">{filename}</span>
                </div>
                <button onClick={() => onChange("")} className="text-[10px] text-muted-foreground hover:text-destructive">remove</button>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">{hint || "Drop a build artifact to register it"}</div>
            )}
          </div>
          <label htmlFor="fileup" className={cn("cursor-pointer rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium hover:border-primary/40 transition-colors", uploading && "opacity-50 pointer-events-none")}>
            {value ? "Replace" : "Browse"}
          </label>
        </div>
        {err && <div className="mt-1.5 text-[10px] text-destructive">{err}</div>}
      </div>
      {value && <input value={value} onChange={e => onChange(e.target.value)} placeholder="or paste a bundle URL" className="mt-2 w-full rounded-lg bg-input border border-border px-3 py-2 text-xs outline-none" />}
    </div>
  );
}