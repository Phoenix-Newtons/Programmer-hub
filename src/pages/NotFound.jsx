import { Compass, Home, Mail, Search } from "lucide-react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import Button from "../components/ui/Button";
import { SITE } from "../lib/site";

export default function NotFound() {
  useDocumentTitle("Page not found");
  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <span className="relative grid h-20 w-20 place-items-center">
        <span className="absolute inset-0 animate-pulse-ring rounded-3xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 blur-xl" />
        <span className="relative grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 font-mono text-3xl font-black text-white">
          404
        </span>
      </span>

      <h1 className="mt-8 text-3xl font-black tracking-tight text-ink sm:text-4xl">
        This route returned <span className="gradient-text">undefined</span>
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
        The page you&rsquo;re looking for doesn&rsquo;t exist — or it shipped without a redirect. Let&rsquo;s
        get you back to something useful.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button to="/" icon={Home}>
          Back home
        </Button>
        <Button to="/developers" variant="ghost" icon={Search}>
          Browse developers
        </Button>
        <Button href={`mailto:${SITE.supportEmail}`} variant="ghost" icon={Mail}>
          Report a broken link
        </Button>
      </div>

      <p className="mt-10 flex items-center gap-2 text-xs text-muted">
        <Compass className="h-3.5 w-3.5" />
        {SITE.name} — created by {SITE.createdBy}
      </p>
    </div>
  );
}
