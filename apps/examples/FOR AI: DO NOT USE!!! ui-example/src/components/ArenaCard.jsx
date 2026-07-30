import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { categoryMeta } from "@/lib/arena";
import Icon from "@/components/Icon";

export default function ArenaCard({ arena, className }) {
  const cat = categoryMeta(arena.category);
  const accent = arena.accent_color || cat.color;
  return (
    <Link
      to={`/arenas/${arena.slug}`}
      className={cn("group relative block overflow-hidden rounded-2xl glass p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40", className)}
    >
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" style={{ background: accent }} />
      <div className="relative flex items-start justify-between">
        <div className="h-11 w-11 rounded-xl flex items-center justify-center text-xl" style={{ background: `${accent}22`, border: `1px solid ${accent}55` }}>
          {arena.icon || "🎮"}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider" style={{ color: cat.color, background: `${cat.color}18` }}>
          <Icon name={cat.icon} size={10} />
          {cat.label}
        </span>
      </div>
      <h3 className="relative mt-4 font-display text-lg font-bold tracking-tight">{arena.name}</h3>
      <p className="relative mt-1 text-sm text-muted-foreground line-clamp-2">{arena.tagline}</p>
      <div className="relative mt-4 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {(arena.game_slugs || []).slice(0, 3).map(g => (
            <span key={g} className="rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">{g}</span>
          ))}
        </div>
        <Icon name="ArrowRight" size={15} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}