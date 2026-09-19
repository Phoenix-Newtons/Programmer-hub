import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  Compass,
  CornerDownLeft,
  FlaskConical,
  FolderGit2,
  Home,
  Info,
  LogOut,
  MoonStar,
  PencilRuler,
  Search,
  Sun,
  UserRound,
  Users,
} from "lucide-react";

import Avatar from "../ui/Avatar";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { openPalette, usePalette } from "../../lib/uiStore";
import { useDemoMode, setDemoMode } from "../../lib/demo";
import { invalidateSearchIndex, loadSearchIndex } from "../../lib/searchIndex";
import { pushRecent, useRecents } from "../../lib/recents";
import { useShortlist } from "../../lib/shortlist";
import { highlight, rankItems } from "../../lib/search";
import useFocusTrap from "../../hooks/useFocusTrap";
import useHotkeys from "../../hooks/useHotkeys";
import { cn, normalizeList, truncate } from "../../lib/utils";

const FIELD_WEIGHTS = {
  developers: { name: 3, title: 2, skills: 2, location: 1.2, bio: 0.8 },
  projects: { title: 3, tags: 2, author_name: 1.6, description: 0.8 },
  jobs: { title: 3, company: 2, skills: 2, location: 1.2, description: 0.8 },
};

const STATIC_COMMANDS = [
  { id: "nav-home", group: "Go to", label: "Home", sublabel: "Landing page", icon: Home, to: "/" },
  { id: "nav-developers", group: "Go to", label: "Developers", sublabel: "Browse the directory", icon: Users, to: "/developers" },
  { id: "nav-projects", group: "Go to", label: "Projects", sublabel: "Proof of work", icon: FolderGit2, to: "/projects" },
  { id: "nav-hiring", group: "Go to", label: "Hiring board", sublabel: "Open roles", icon: Briefcase, to: "/hiring" },
  { id: "nav-about", group: "Go to", label: "About", sublabel: "Who built this", icon: Info, to: "/about" },
  { id: "nav-dashboard", group: "Go to", label: "Dashboard", sublabel: "Your profile, projects and roles", icon: PencilRuler, to: "/dashboard", auth: true },
  { id: "nav-shortlist", group: "Go to", label: "Shortlist", sublabel: "Developers you saved", icon: Compass, to: "/shortlist" },
];

/** Small helper: wraps a matched string so the query part is highlighted. */
function Highlighted({ text = "", query }) {
  const chunks = useMemo(() => highlight(text, query), [text, query]);
  return (
    <>
      {chunks.map((chunk, index) =>
        chunk.match ? (
          <mark key={index} className="rounded bg-brand-500/25 px-0.5 text-ink">
            {chunk.text}
          </mark>
        ) : (
          <span key={index}>{chunk.text}</span>
        )
      )}
    </>
  );
}

/**
 * Command palette (⌘K / Ctrl+K, or just `/`). Searches developers, projects and
 * roles in one place and doubles as a keyboard-driven navigation menu.
 */
export default function CommandPalette() {
  const { open, paletteQuery, closePalette, setQuery } = usePalette();
  const [index, setIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated, signOut, displayName, profile } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const demoMode = useDemoMode();
  const recents = useRecents();
  const shortlist = useShortlist();

  // ⌘K / Ctrl+K toggles, "/" opens (both ignored while typing in a field).
  useHotkeys("mod+k", () => (open ? closePalette() : openPalette("")), { ignoreInputs: false });
  useHotkeys("/", () => openPalette(""));

  useFocusTrap(panelRef, open, { onEscape: closePalette, initialFocus: "[data-palette-input]" });

  // Load (and cache) the searchable data the first time the palette opens.
  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    if (!index) setLoading(true);
    loadSearchIndex()
      .then((data) => {
        if (alive) setIndex(data);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, index]);

  useEffect(() => {
    if (open) setActive(0);
  }, [open, paletteQuery]);

  // Keep the active row in view while arrowing through the list.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector('[data-active="true"]');
    if (node && typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ block: "nearest" });
    }
  }, [active, open]);

  const results = useMemo(() => {
    const commands = STATIC_COMMANDS.filter((command) => !command.auth || isAuthenticated).map((command) => ({
      ...command,
      group: "Go to",
      searchable: `${command.label} ${command.sublabel}`,
    }));

    const actions = [
      {
        id: "action-theme",
        group: "Actions",
        label: isDark ? "Switch to light theme" : "Switch to dark theme",
        sublabel: "Toggle appearance",
        icon: isDark ? Sun : MoonStar,
        keywords: "theme dark light appearance",
        run: toggleTheme,
      },
      {
        id: "action-demo",
        group: "Actions",
        label: demoMode ? "Turn sample data off" : "Preview with sample data",
        sublabel: demoMode ? "Back to live Supabase data" : "Fictional rows, saving disabled",
        icon: FlaskConical,
        keywords: "demo sample mock preview data",
        run: () => {
          setDemoMode(!demoMode);
          invalidateSearchIndex();
          toast.success(demoMode ? "Sample data off — showing live data." : "Sample data on — explore the full UI.");
        },
      },
      { id: "action-projects", group: "Actions", label: "Publish a project", sublabel: "Add shipped work", icon: FolderGit2, to: "/projects", keywords: "new project publish portfolio", auth: true },
      { id: "action-role", group: "Actions", label: "Post a role", sublabel: "Hire on the hub", icon: Briefcase, to: "/hiring", keywords: "job post hire role", auth: true },
      { id: "action-profile", group: "Actions", label: "Edit my profile", sublabel: "Stack, rate, links", icon: UserRound, to: "/dashboard", keywords: "profile edit account", auth: true },
    ].filter((action) => !action.auth || isAuthenticated);

    if (isAuthenticated) {
      actions.push({
        id: "action-signout",
        group: "Actions",
        label: "Sign out",
        sublabel: displayName ? `Signed in as ${displayName}` : "End this session",
        icon: LogOut,
        keywords: "logout sign out exit",
        run: () => signOut().then(() => toast.info("Signed out.")),
      });
    }

    const query = paletteQuery.trim();
    if (!query) {
      const recentItems = recents.map((item) => ({
        ...item,
        group: "Recents",
        icon: item.id.startsWith("dev-") ? UserRound : item.id.startsWith("job-") ? Briefcase : FolderGit2,
        keywords: item.sublabel || "",
      }));

      return [
        { group: "Recents", items: recentItems },
        { group: "Go to", items: commands.slice(0, 6) },
        { group: "Actions", items: actions.slice(0, 4) },
      ].filter((section) => section.items.length);
    }

    const developers = index?.developers || [];
    const projects = index?.projects || [];
    const jobs = index?.jobs || [];

    const devMatches = rankItems(developers, query, {
      fields: (item) => ({
        name: item.name,
        title: item.title,
        skills: normalizeList(item.skills),
        location: item.location,
        bio: item.bio,
      }),
      weights: FIELD_WEIGHTS.developers,
      limit: 6,
    }).map(({ item }) => ({
      id: `dev-${item.id}`,
      group: "Developers",
      label: item.name || "Unnamed developer",
      sublabel: [item.title, item.location].filter(Boolean).join(" • "),
      to: `/developers/${item.id}`,
      avatar: { name: item.name, src: item.avatar_url },
      keywords: normalizeList(item.skills).join(" "),
    }));

    const projectMatches = rankItems(projects, query, {
      fields: (item) => ({
        title: item.title,
        tags: normalizeList(item.tags),
        author_name: item.author_name,
        description: item.description,
      }),
      weights: FIELD_WEIGHTS.projects,
      limit: 5,
    }).map(({ item }) => ({
      id: `project-${item.id}`,
      group: "Projects",
      label: item.title || "Untitled project",
      sublabel: [item.author_name, normalizeList(item.tags).slice(0, 3).join(", ")].filter(Boolean).join(" • "),
      to: "/projects",
      icon: FolderGit2,
      keywords: normalizeList(item.tags).join(" "),
    }));

    const jobMatches = rankItems(jobs, query, {
      fields: (item) => ({
        title: item.title,
        company: item.company,
        skills: normalizeList(item.skills),
        location: item.location,
        description: item.description,
      }),
      weights: FIELD_WEIGHTS.jobs,
      limit: 5,
    }).map(({ item }) => ({
      id: `job-${item.id}`,
      group: "Roles",
      label: item.title || "Untitled role",
      sublabel: [item.company, item.location, item.budget ? `${item.budget}` : ""].filter(Boolean).join(" • "),
      to: "/hiring",
      icon: Briefcase,
      keywords: normalizeList(item.skills).join(" "),
    }));

    const commandMatches = rankItems(commands, query, {
      fields: (item) => ({ label: item.label, sublabel: item.sublabel, keywords: item.keywords || "" }),
      weights: { label: 3, sublabel: 1.4, keywords: 1.2 },
      limit: 4,
    }).map(({ item }) => item);

    const actionMatches = rankItems(actions, query, {
      fields: (item) => ({ label: item.label, sublabel: item.sublabel, keywords: item.keywords || "" }),
      weights: { label: 3, sublabel: 1.4, keywords: 1.2 },
      limit: 4,
    }).map(({ item }) => item);

    return [
      { group: "Developers", items: devMatches },
      { group: "Roles", items: jobMatches },
      { group: "Projects", items: projectMatches },
      { group: "Go to", items: commandMatches },
      { group: "Actions", items: actionMatches },
    ].filter((section) => section.items.length);
  }, [paletteQuery, index, recents, isAuthenticated, isDark, demoMode, displayName, signOut, toast, toggleTheme]);

  const flat = useMemo(() => results.flatMap((section) => section.items), [results]);

  const runEntry = useCallback(
    (entry) => {
      if (!entry) return;
      pushRecent(entry);
      closePalette();
      if (entry.run) {
        entry.run();
        return;
      }
      if (entry.to) navigate(entry.to);
    },
    [closePalette, navigate]
  );

  // Keyboard handling on the input itself (arrows, enter, tab).
  function onInputKeyDown(event) {
    if (event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey)) {
      event.preventDefault();
      setActive((current) => (flat.length ? (current + 1) % flat.length : 0));
      return;
    }
    if (event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey)) {
      event.preventDefault();
      setActive((current) => (flat.length ? (current - 1 + flat.length) % flat.length : 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      runEntry(flat[active]);
    }
  }

  if (!open) return null;

  let cursor = -1; // running index across sections for keyboard navigation
  const activeId = flat[active] ? `palette-item-${flat[active].id}` : undefined;

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center p-3 pt-[8vh] sm:p-6 sm:pt-[12vh]">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={closePalette} aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search Programmer's Hub"
        className="relative flex max-h-[80vh] w-full max-w-2xl animate-rise flex-col overflow-hidden rounded-2xl border border-line-strong bg-surface-solid shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <input
            data-palette-input
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            value={paletteQuery}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Search developers, projects, roles or jump to a page…"
            className="flex-1 bg-transparent text-[0.95rem] text-ink outline-none placeholder:text-muted"
            autoComplete="off"
            spellCheck="false"
          />
          <kbd className="hidden rounded-md border border-line-strong bg-surface px-1.5 py-0.5 font-mono text-[0.68rem] font-semibold text-muted sm:block">
            esc
          </kbd>
        </div>

        <div id="palette-results" ref={listRef} role="listbox" aria-label="Results" className="flex-1 overflow-y-auto overscroll-contain p-2">
          {loading && !index ? (
            <p className="px-3 py-6 text-center text-sm text-muted">Searching the hub…</p>
          ) : null}

          {!loading && !flat.length ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-semibold text-ink">No matches for “{paletteQuery}”</p>
              <p className="mt-1 text-xs text-muted">
                Try a skill like <span className="font-mono">react</span>, a city, or a page name like{" "}
                <span className="font-mono">hiring</span>.
              </p>
            </div>
          ) : null}

          {results.map((section) => (
            <div key={section.group} className="mb-1">
              <p className="px-3 pb-1 pt-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-muted">
                {section.group}
              </p>
              {section.items.map((entry) => {
                cursor += 1;
                const isActive = cursor === active;
                const Icon = entry.icon || UserRound;
                return (
                  <div
                    key={entry.id}
                    id={`palette-item-${entry.id}`}
                    role="option"
                    aria-selected={isActive}
                    data-active={isActive}
                    onMouseEnter={() => setActive(cursor)}
                    onClick={() => runEntry(entry)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition",
                      isActive ? "bg-brand-500/15" : "hover:bg-white/5"
                    )}
                  >
                    {entry.avatar ? (
                      <Avatar name={entry.avatar.name} src={entry.avatar.src} size="sm" ring={false} />
                    ) : (
                      <span
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line-strong",
                          isActive ? "bg-brand-500/20 text-brand-200" : "bg-surface text-brand-300"
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        <Highlighted text={entry.label} query={paletteQuery} />
                      </span>
                      {entry.sublabel ? (
                        <span className="block truncate text-xs text-muted">
                          <Highlighted text={truncate(entry.sublabel, 80)} query={paletteQuery} />
                        </span>
                      ) : null}
                    </span>
                    {isActive ? (
                      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-line-strong" aria-hidden="true" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-black/10 px-4 py-2.5 text-[0.7rem] text-muted">
          <span className="flex items-center gap-3">
            <span className="hidden sm:inline">
              <kbd className="font-mono font-semibold text-ink-soft">↑↓</kbd> navigate
            </span>
            <span className="hidden sm:inline">
              <kbd className="font-mono font-semibold text-ink-soft">↵</kbd> open
            </span>
            <span>
              <kbd className="font-mono font-semibold text-ink-soft">esc</kbd> close
            </span>
          </span>
          <span className="flex items-center gap-2">
            {shortlist.count ? (
              <button
                type="button"
                onClick={() => runEntry({ id: "nav-shortlist", label: "Shortlist", to: "/shortlist", group: "Go to" })}
                className="font-semibold text-amber-200 hover:underline"
              >
                {shortlist.count} shortlisted
              </button>
            ) : null}
            {profile?.name ? <span className="hidden sm:inline">{profile.name}</span> : null}
          </span>
        </div>
      </div>
    </div>
  );
}
