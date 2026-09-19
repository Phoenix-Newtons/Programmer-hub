import { Check, Copy, Link2, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { X as Twitter } from "../brand/BrandIcons";
import { useToast } from "../../context/ToastContext";
import { cn, copyToClipboard } from "../../lib/utils";

/**
 * Share control: native share sheet when the browser supports it, plus copy
 * link, WhatsApp and X shortcuts.
 */
export default function ShareMenu({ title = "", text = "", url, className, compact = false }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef(null);
  const toast = useToast();

  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function handleCopy() {
    const ok = await copyToClipboard(shareUrl);
    setCopied(ok);
    if (ok) {
      toast.success("Link copied to your clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Could not copy the link — copy it from the address bar instead.");
    }
    setOpen(false);
  }

  async function handleShare() {
    if (navigator?.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch {
        /* user cancelled — fall through to the menu */
      }
    }
    setOpen((current) => !current);
  }

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(text || title);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={handleShare}
        className={cn("btn btn-ghost gap-2", compact ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm")}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Share2 className="h-3.5 w-3.5 text-brand-300" />
        {compact ? <span className="sr-only">Share</span> : "Share"}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-line-strong bg-surface-solid p-1 shadow-soft"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleCopy}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink-soft transition hover:bg-white/5"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            Copy link
          </button>
          <a
            role="menuitem"
            href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink-soft transition hover:bg-white/5"
          >
            <Link2 className="h-4 w-4" />
            Share on WhatsApp
          </a>
          <a
            role="menuitem"
            href={`https://x.com/intent/post?text=${encodedText}&url=${encodedUrl}`}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink-soft transition hover:bg-white/5"
          >
            <Twitter className="h-4 w-4" />
            Post on X
          </a>
        </div>
      ) : null}
    </div>
  );
}
