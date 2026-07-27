import React from "react";
import { cn } from "@/lib/utils";

export default function LiveBadge({ status = "running", label, className }) {
  const map = {
    running: { dot: "bg-success", text: "text-success", label: label || "LIVE" },
    paused: { dot: "bg-warning", text: "text-warning", label: label || "PAUSED" },
    finished: { dot: "bg-primary", text: "text-primary", label: label || "FINISHED" },
    waiting: { dot: "bg-muted-foreground", text: "text-muted-foreground", label: label || "WAITING" },
    aborted: { dot: "bg-destructive", text: "text-destructive", label: label || "ABORTED" }
  };
  const m = map[status] || map.waiting;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider", m.text, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot, status === "running" && "animate-pulse-glow")} />
      {m.label}
    </span>
  );
}