export interface LegendItem {
  color: string;
  label: string;
  ring?: boolean;
}

export default function Legend({ items, title }: { items: LegendItem[]; title?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300">
      {title && <span className="font-medium text-slate-400">{title}:</span>}
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3.5 w-3.5 rounded-full"
            style={{
              backgroundColor: it.color,
              boxShadow: it.ring ? "0 0 0 2px #fff" : undefined,
            }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}
