interface PageLoaderProps {
  label?: string;
}

export function PageLoader({ label = 'Loading' }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      </div>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}…
      </span>
    </div>
  );
}

export default PageLoader;
