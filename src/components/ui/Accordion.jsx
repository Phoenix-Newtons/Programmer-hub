import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "../../lib/utils";

export default function Accordion({ items, className }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className={cn("divide-y divide-line overflow-hidden rounded-2xl border border-line", className)}>
      {items.map((item, index) => {
        const open = openIndex === index;
        return (
          <div key={item.question} className="bg-surface">
            <button
              type="button"
              onClick={() => setOpenIndex(open ? -1 : index)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-brand-500/5"
            >
              <span className="text-sm font-bold text-ink sm:text-base">{item.question}</span>
              <Plus
                className={cn(
                  "h-4 w-4 shrink-0 text-brand-300 transition-transform duration-300",
                  open && "rotate-45"
                )}
              />
            </button>
            <div
              className={cn(
                "grid transition-all duration-300 ease-out",
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
