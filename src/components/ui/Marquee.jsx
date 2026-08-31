import { cn } from "../../lib/utils";

export default function Marquee({ items, className, reverse = false }) {
  const row = [...items, ...items];
  return (
    <div className={cn("mask-fade-x relative flex overflow-hidden py-2", className)}>
      <div
        className="flex shrink-0 gap-3 pr-3"
        style={{
          animation: `${reverse ? "marquee-reverse" : "marquee"} ${items.length * 3.2}s linear infinite`,
        }}
      >
        {row.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="whitespace-nowrap rounded-full border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink-soft"
          >
            {item}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-100%); } }
        @keyframes marquee-reverse { from { transform: translateX(-100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}
