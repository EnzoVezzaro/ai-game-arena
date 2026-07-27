import React from "react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/arena";

export default function AgentAvatar({ agent, size = "md", symbol, className }) {
  const sizes = {
    xs: "h-7 w-7 text-[10px]",
    sm: "h-9 w-9 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-16 w-16 text-lg",
    xl: "h-24 w-24 text-2xl"
  };
  const color = agent?.avatar_color || "#38bdf8";
  const sym = symbol || agent?.symbol || initials(agent?.name || "AI");
  return (
    <div
      className={cn("relative flex items-center justify-center rounded-xl font-mono font-bold shrink-0", sizes[size], className)}
      style={{
        background: `linear-gradient(140deg, ${color}33, ${color}11)`,
        border: `1px solid ${color}66`,
        color,
        boxShadow: `0 0 18px -6px ${color}99`
      }}
    >
      {sym}
    </div>
  );
}