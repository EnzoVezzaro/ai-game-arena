import React from "react";
import { cn } from "@/lib/utils";
import { pluginCategoryMeta, installStatusMeta } from "@/lib/arena";
import Icon from "@/components/Icon";

export default function PluginCard({ plugin, className, onInstall, onDelete }) {
  const cat = pluginCategoryMeta(plugin.category);
  const st = installStatusMeta(plugin.install_status || "installed");
  const installed = (plugin.install_status || "installed") === "installed";
  return (
    <div className={cn("group relative rounded-2xl glass p-4 transition-all hover:border-primary/40", className, installed ? "" : "opacity-75")}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${cat.color}1a`, border: `1px solid ${cat.color}40`, color: cat.color }}>
          <Icon name={cat.icon} size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">{plugin.name}</h4>
            {plugin.version && <span className="font-mono text-[9px] text-muted-foreground">v{plugin.version}</span>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{plugin.description}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase shrink-0" style={{ color: st.color, background: `${st.color}18` }} title={st.label}>
          <Icon name={st.icon} size={9} />
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {(plugin.contributions || []).slice(0, 3).map((c, i) => (
          <span key={i} className="rounded-md bg-muted/50 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">{c}</span>
        ))}
        {plugin.bundle_url && <span className="inline-flex items-center gap-0.5 rounded-md bg-success/10 text-success px-1.5 py-0.5 font-mono text-[9px]"><Icon name="Box" size={9} /> bundle</span>}
      </div>
      {(onInstall || onDelete) && (
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5">
          {onInstall && (
            <button onClick={() => onInstall(plugin)} className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors", installed ? "bg-muted/40 text-muted-foreground hover:text-foreground" : "bg-primary/15 text-primary hover:bg-primary/25")}>
              <Icon name={installed ? "PowerOff" : "Power"} size={11} /> {installed ? "Uninstall" : "Install"}
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(plugin)} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-muted-foreground hover:text-destructive transition-colors">
              <Icon name="Trash2" size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}