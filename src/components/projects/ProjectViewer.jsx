import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Globe, Loader2, RefreshCw, ShieldQuestion, X } from "lucide-react";

import Button from "../ui/Button";
import { Github } from "../brand/BrandIcons";
import useFocusTrap from "../../hooks/useFocusTrap";
import { hostFromUrl, safeText } from "../../lib/utils";

/** How long a frame may stay blank before we suggest opening it in a tab. */
const SLOW_LOAD_MS = 7000;

/**
 * Embedded pages are untrusted third-party code, so they run inside a sandbox
 * and can never navigate or restyle the hub. `allow-same-origin` is dropped
 * when the target is this very origin: a same-origin frame with both
 * `allow-scripts` and `allow-same-origin` could reach out of the sandbox.
 */
function sandboxFor(url) {
  const base = [
    "allow-scripts",
    "allow-forms",
    "allow-popups",
    "allow-popups-to-escape-sandbox",
    "allow-modals",
    "allow-downloads",
  ];
  try {
    const sameOrigin = new URL(url, window.location.origin).origin === window.location.origin;
    return sameOrigin ? base.join(" ") : ["allow-same-origin", ...base].join(" ");
  } catch {
    return base.join(" ");
  }
}

/**
 * The "project window": every project's live URL opens inside the hub, in a
 * sandboxed iframe with its own title bar, reload button and an escape hatch to
 * a real browser tab for sites that refuse to be framed.
 */
export default function ProjectViewer({ project, open, onClose }) {
  const panelRef = useRef(null);
  const [state, setState] = useState("loading"); // loading | ready | slow
  const [nonce, setNonce] = useState(0);

  const url = project?.live_url || "";
  const title = safeText(project?.title, "Project");
  const host = hostFromUrl(url);
  const sandbox = open && url ? sandboxFor(url) : "";

  useFocusTrap(panelRef, Boolean(open), {
    onEscape: onClose,
    initialFocus: "[data-autofocus]",
  });

  // Fresh state every time the window is opened or reloaded.
  useEffect(() => {
    if (!open) return undefined;
    setState("loading");
    const timer = setTimeout(
      () => setState((current) => (current === "loading" ? "slow" : current)),
      SLOW_LOAD_MS
    );
    return () => clearTimeout(timer);
  }, [open, nonce, url]);

  // Keep the page behind the window still.
  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  const reload = () => setNonce((value) => value + 1);

  return createPortal(
    <div className="fixed inset-0 z-[94] flex items-end justify-center p-0 sm:items-center sm:p-5">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-viewer-title"
        className="relative flex h-[100dvh] w-full max-w-6xl animate-rise flex-col overflow-hidden rounded-t-3xl border border-line-strong bg-surface-solid shadow-2xl sm:h-[92dvh] sm:rounded-3xl"
      >
        {/* Title bar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </span>

          <div className="min-w-0 flex-1">
            <h2 id="project-viewer-title" className="truncate text-sm font-bold text-ink">
              {title}
            </h2>
            <p className="flex items-center gap-1.5 truncate text-xs text-muted">
              <Globe className="h-3 w-3 shrink-0" aria-hidden="true" />
              {host || "No live URL"}
              <span className="hidden sm:inline">· running in a sandboxed window</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={reload}
              disabled={!url}
              aria-label="Reload project"
              title="Reload"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </Button>
            {url ? (
              <Button
                variant="ghost"
                size="icon"
                href={url}
                aria-label="Open project in a new tab"
                title="Open in a new tab"
                data-autofocus
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close project window"
              title="Close"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Frame */}
        <div className="relative flex-1 bg-white/5">
          {url ? (
            <>
              <iframe
                key={nonce}
                src={url}
                title={`${title} — live project`}
                className="h-full w-full border-0 bg-white"
                sandbox={sandbox}
                referrerPolicy="no-referrer"
                loading="lazy"
                onLoad={() => setState("ready")}
              />

              {state === "loading" ? (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-solid">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-300" aria-hidden="true" />
                  <p className="text-sm font-semibold text-muted">Loading {host || "project"}…</p>
                </div>
              ) : null}

              {state === "slow" ? (
                <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-solid/95 px-4 py-3 text-xs text-muted backdrop-blur">
                  <span className="flex items-start gap-2">
                    <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                    Still blank? Some sites block being embedded (X-Frame-Options / CSP).
                  </span>
                  <span className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={reload}>
                      Try again
                    </Button>
                    <Button variant="ghost" size="sm" href={url} iconRight={ExternalLink}>
                      Open in a tab
                    </Button>
                  </span>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl border border-line-strong bg-brand-500/10 text-brand-300">
                <Globe className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-base font-bold text-ink">No live URL yet</h3>
                <p className="mt-1 max-w-md text-sm leading-relaxed text-muted">
                  This project has not published a demo. Ask the author for a live link, or browse the source
                  instead.
                </p>
              </div>
              {project?.repo_url ? (
                <Button variant="ghost" href={project.repo_url} icon={Github}>
                  Open repository
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Re-exported for the cards that need to know whether a project can be framed. */
export function canEmbed(project) {
  if (!project?.live_url) return false;
  try {
    const url = new URL(project.live_url, window.location.origin);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}
