import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  MonitorDown,
  MoreVertical,
  PlusSquare,
  Share,
  Smartphone,
  X,
} from "lucide-react";

import Modal from "../ui/Modal";
import { useToast } from "../../context/ToastContext";
import { useInstallApp } from "../../lib/installApp";
import { cn } from "../../lib/utils";

const DISMISS_KEY = "ph:install-banner-dismissed";

const PLATFORM_STEPS = {
  ios: {
    title: "Add to your Home Screen",
    icon: Smartphone,
    steps: [
      { icon: Share, text: "Tap the Share button in Safari's toolbar." },
      { icon: PlusSquare, text: "Choose “Add to Home Screen”." },
      { icon: CheckCircle2, text: "Tap Add — Programmer's Hub opens like a native app." },
    ],
  },
  android: {
    title: "Install from your browser menu",
    icon: Smartphone,
    steps: [
      { icon: MoreVertical, text: "Open the browser menu (⋮) in Chrome or Samsung Internet." },
      { icon: MonitorDown, text: "Tap “Install app” or “Add to Home screen”." },
      { icon: CheckCircle2, text: "Confirm Install — the hub lands in your app drawer." },
    ],
  },
  desktop: {
    title: "Install on this computer",
    icon: MonitorDown,
    steps: [
      { icon: MonitorDown, text: "Click the install icon at the right of the address bar." },
      { icon: Download, text: "Or open the browser menu and choose “Install Programmer's Hub”." },
      { icon: CheckCircle2, text: "The hub gets its own window, taskbar/dock icon and offline shell." },
    ],
  },
};

/** Step-by-step fallback for browsers with no programmatic prompt (iOS…). */
export function InstallInstructions({ open, onClose }) {
  const { platform } = useInstallApp();
  const guide = PLATFORM_STEPS[platform] || PLATFORM_STEPS.desktop;
  const GuideIcon = guide.icon;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Get the app"
      description={guide.title}
      icon={GuideIcon}
      size="sm"
    >
      <ol className="grid gap-3">
        {guide.steps.map((step, index) => {
          const StepIcon = step.icon;
          return (
            <li
              key={step.text}
              className="flex items-start gap-3 rounded-xl border border-line bg-surface px-3.5 py-3"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500/20 font-mono text-xs font-black text-brand-200 ring-1 ring-brand-400/40">
                {index + 1}
              </span>
              <span className="flex flex-1 items-start gap-2 text-sm leading-relaxed text-ink-soft">
                <StepIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                {step.text}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 rounded-xl border border-line bg-surface px-3.5 py-3 text-xs leading-relaxed text-muted">
        One install works everywhere: the same app runs on phone, tablet and desktop, keeps its offline shell
        after the first visit, and updates itself in the background.
      </p>
    </Modal>
  );
}

/**
 * "Install app" button. Fires the native prompt when Chrome/Edge captured
 * one; otherwise opens the platform instructions. Renders an "App installed"
 * state (or nothing, with `hideWhenInstalled`) once installed.
 */
export function InstallAppButton({ className, hideWhenInstalled = false, label = "Install app" }) {
  const { canPrompt, installed, promptInstall } = useInstallApp();
  const toast = useToast();
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  if (installed && hideWhenInstalled) return null;

  async function handleClick() {
    if (installed) {
      toast.success("Programmer's Hub is already installed on this device.");
      return;
    }
    if (!canPrompt) {
      setInstructionsOpen(true);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === "accepted")
      toast.success("Installing Programmer's Hub — look for it on your home screen.");
    else if (outcome === "unavailable") setInstructionsOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          installed
            ? "btn btn-ghost border-emerald-400/40 px-3.5 py-2 text-xs text-emerald-300"
            : "btn btn-soft px-3.5 py-2 text-xs",
          className
        )}
        aria-label={installed ? "Programmer's Hub app is installed" : "Install the Programmer's Hub app"}
        title={installed ? "Installed on this device" : "Download / install the app"}
      >
        {installed ? (
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">{installed ? "App installed" : label}</span>
      </button>
      <InstallInstructions open={instructionsOpen} onClose={() => setInstructionsOpen(false)} />
    </>
  );
}

/**
 * Dismissible bottom install banner. Only shows when an install is actually
 * possible (captured prompt, or iOS where instructions are the path), the
 * app is not installed yet, and the user hasn't dismissed it this session.
 */
export function InstallAppBanner() {
  const { canPrompt, installed, platform, promptInstall } = useInstallApp();
  const toast = useToast();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [settled, setSettled] = useState(false);

  // Give `beforeinstallprompt` a moment to arrive before deciding.
  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const eligible = !installed && !dismissed && settled && (canPrompt || platform === "ios");
  if (!eligible) return null;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* session storage unavailable */
    }
  }

  async function handleInstall() {
    if (!canPrompt) {
      setInstructionsOpen(true);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      toast.success("Installing Programmer's Hub — look for it on your home screen.");
      dismiss();
    } else if (outcome === "unavailable") setInstructionsOpen(true);
  }

  return (
    <>
      <div
        className="animate-rise fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-lg rounded-2xl border border-brand-400/40 bg-bg-elev/95 p-4 shadow-soft backdrop-blur-xl sm:inset-x-6 sm:bottom-6"
        role="region"
        aria-label="Install the Programmer's Hub app"
      >
        <div className="flex items-start gap-3">
          <img src="/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl ring-1 ring-line-strong" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">Get the Programmer&rsquo;s Hub app</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              Install it on this device — phone, tablet or desktop. Opens full-screen, works offline, no app
              store needed.
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={handleInstall} className="btn btn-primary px-3.5 py-2 text-xs">
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Install app
              </button>
              <button type="button" onClick={dismiss} className="btn btn-ghost px-3.5 py-2 text-xs">
                Not now
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1.5 text-muted transition hover:text-ink"
            aria-label="Dismiss install banner"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <InstallInstructions open={instructionsOpen} onClose={() => setInstructionsOpen(false)} />
    </>
  );
}
