import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Disclosure list. One panel open at a time, full keyboard support and
 * `aria-controls` wiring so assistive tech can follow the toggle.
 */
export default function Accordion({ items, className, defaultOpen = 0, allowMultiple = false }) {
  const [openIndexes, setOpenIndexes] = useState(
    defaultOpen === null ? [] : Array.isArray(defaultOpen) ? defaultOpen : [defaultOpen]
  );
  const baseId = useId();

  function toggle(index) {
    setOpenIndexes((current) => {
      const isOpen = current.includes(index);
      if (allowMultiple) return isOpen ? current.filter((i) => i !== index) : [...current, index];
      return isOpen ? [] : [index];
    });
  }

  return (
    <div className={cn("divide-y divide-line overflow-hidden rounded-2xl border border-line", className)}>
      {items.map((item, index) => {
        const open = openIndexes.includes(index);
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;
        return (
          <div key={item.question} className="bg-surface">
            <h3>
              <button
                id={buttonId}
                type="button"
                onClick={() => toggle(index)}
                aria-expanded={open}
                aria-controls={panelId}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-brand-500/5"
              >
                <span className="text-sm font-bold text-ink sm:text-base">{item.question}</span>
                <Plus
                  className={cn(
                    "h-4 w-4 shrink-0 text-brand-300 transition-transform duration-300",
                    open && "rotate-45"
                  )}
                  aria-hidden="true"
                />
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open} className="px-5 pb-5">
              <p className="text-sm leading-relaxed text-muted">{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
