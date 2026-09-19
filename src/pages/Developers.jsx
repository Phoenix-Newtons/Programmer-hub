import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookmarkCheck,
  Briefcase,
  MapPin,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import PageHeading from "../components/layout/PageHeading";
import DeveloperCard from "../components/cards/DeveloperCard";
import FilterPills from "../components/ui/FilterPills";
import SearchInput from "../components/ui/SearchInput";
import SortSelect from "../components/ui/SortSelect";
import ResultCount from "../components/ui/ResultCount";
import EmptyState from "../components/ui/EmptyState";
import SetupNotice from "../components/ui/SetupNotice";
import Button from "../components/ui/Button";
import LoadMore from "../components/ui/LoadMore";
import ShareMenu from "../components/ui/ShareMenu";
import { GridSkeleton } from "../components/ui/Skeletons";
import useCollection from "../hooks/useCollection";
import useDebouncedValue from "../hooks/useDebouncedValue";
import useHotkeys from "../hooks/useHotkeys";
import usePageMeta from "../hooks/usePageMeta";
import useUrlFilters from "../hooks/useUrlFilters";
import { fetchProfiles } from "../lib/api";
import { DEVELOPER_SORTS, PAGE_SIZE, SITE, SKILL_FILTERS } from "../lib/site";
import { useShortlist, syncShortlist } from "../lib/shortlist";
import { rankItems } from "../lib/search";
import { normalizeList, parseRate, sortBy } from "../lib/utils";

export default function Developers() {
  const { data, error, loading, refetch } = useCollection(fetchProfiles);
  const shortlist = useShortlist();
  const searchRef = useRef(null);

  const { values, setValues, reset, isFiltered } = useUrlFilters({
    q: "",
    skill: "All",
    sort: "relevance",
    open: "0",
  });

  // Local input state mirrored into the URL after a short debounce.
  const [query, setQuery] = useState(values.q);
  const debouncedQuery = useDebouncedValue(query, 250);

  useEffect(() => {
    setValues({ q: debouncedQuery });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  // Keep the field in sync when the URL changes (back/forward, shared link).
  useEffect(() => {
    setQuery((current) => (current === values.q ? current : values.q));
  }, [values.q]);

  useHotkeys("/", () => searchRef.current?.focus());

  usePageMeta({
    title: "Developers",
    description:
      "Search the Programmer's Hub directory by stack, city or availability. Every profile belongs to a real signed-in member with shipped work.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Developers on Programmer's Hub",
      description: "A searchable directory of developers and their stacks.",
      url: `${SITE.repo}`,
    },
  });

  // Live profile data refreshes the shortlist snapshots.
  useEffect(() => {
    if (data.length) syncShortlist(data);
  }, [data]);

  /** Facets: the curated list plus any skill that actually appears in the data. */
  const skillOptions = useMemo(() => {
    const counts = new Map();
    data.forEach((profile) => {
      normalizeList(profile.skills).forEach((skill) => {
        const key = skill.trim();
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    });
    const curated = SKILL_FILTERS.filter((skill) => skill !== "All");
    const extra = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([skill]) => skill)
      .filter((skill) => !curated.some((item) => item.toLowerCase() === skill.toLowerCase()));
    const options = [...curated, ...extra.slice(0, 6)];
    return [
      { value: "All", label: "All", count: data.length },
      ...options.map((skill) => ({ value: skill, label: skill, count: counts.get(skill) || 0 })),
    ];
  }, [data]);

  const results = useMemo(() => {
    const openOnly = values.open === "1";
    let pool = data.filter((profile) => {
      const skills = normalizeList(profile.skills);
      const matchesSkill =
        values.skill === "All" || skills.some((skill) => skill.toLowerCase() === values.skill.toLowerCase());
      const matchesOpen = !openOnly || Boolean(profile.open_to_work);
      return matchesSkill && matchesOpen;
    });

    if (values.q.trim()) {
      pool = rankItems(pool, values.q, {
        fields: (profile) => ({
          name: profile.name,
          title: profile.title,
          skills: normalizeList(profile.skills),
          location: profile.location,
          experience: profile.experience,
          bio: profile.bio,
        }),
        weights: { name: 3, skills: 2.2, title: 2, location: 1.4, experience: 1.2, bio: 0.8 },
      }).map(({ item }) => item);
    } else if (values.sort === "relevance") {
      pool = sortBy(pool, (profile) => Boolean(profile.featured), "desc");
    }

    switch (values.sort) {
      case "rating":
        return sortBy(pool, (profile) => Number(profile.rating) || 0, "desc");
      case "rate-low":
        return sortBy(pool, (profile) => parseRate(profile.hourly_rate));
      case "newest":
        return sortBy(pool, (profile) => new Date(profile.created_at || 0).getTime(), "desc");
      case "name":
        return sortBy(pool, (profile) => String(profile.name || "").toLowerCase());
      default:
        return pool;
    }
  }, [data, values.q, values.skill, values.open, values.sort]);

  // Reset pagination whenever the result set changes.
  const [visible, setVisible] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [values.q, values.skill, values.open, values.sort]);

  const shown = results.slice(0, visible);

  return (
    <div className="container-page py-12 sm:py-16">
      <PageHeading
        eyebrow="Directory"
        icon={Users}
        breadcrumbs={[{ label: "Developers" }]}
        title="Find a developer by stack, not by CV."
        description="Every profile below lives in Supabase and belongs to a real signed-in member. Search by skill, title or location, then reach out directly."
      >
        <ShareMenu
          title="Developers on Programmer's Hub"
          text="Browse developers by stack, city and availability."
        />
        <Button to="/dashboard" icon={UserPlus}>
          Create my profile
        </Button>
      </PageHeading>

      {/* Search + filters */}
      <div className="card mt-10 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <SearchInput
            ref={searchRef}
            value={query}
            onChange={setQuery}
            placeholder="Search React, Kampala, backend… try “fzzy”"
            label="Search developers"
            hint="/"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setValues({ open: values.open === "1" ? "0" : "1" })}
              aria-pressed={values.open === "1"}
              className={`btn ${
                values.open === "1"
                  ? "border-transparent bg-emerald-500/20 text-emerald-300"
                  : "border-line-strong bg-surface text-muted hover:text-ink"
              }`}
            >
              <Briefcase className="h-4 w-4" aria-hidden="true" />
              Open to work
            </button>

            <SortSelect
              options={DEVELOPER_SORTS}
              value={values.sort}
              onChange={(sort) => setValues({ sort })}
            />

            {isFiltered ? (
              <Button
                variant="ghost"
                icon={X}
                onClick={() => {
                  setQuery("");
                  reset();
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <FilterPills
            options={skillOptions}
            value={values.skill}
            onChange={(skill) => setValues({ skill })}
            ariaLabel="Filter by skill"
            className="no-scrollbar"
          />
        </div>
      </div>

      {shortlist.count ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-100">
            <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
            {shortlist.count} {shortlist.count === 1 ? "developer" : "developers"} on your shortlist
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" to="/shortlist">
              Open shortlist
            </Button>
            <Button size="sm" variant="subtle" icon={X} onClick={() => shortlist.clear()}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <ResultCount
        className="mt-6"
        count={results.length}
        singular="developer found"
        plural="developers found"
        loading={loading}
        loadingLabel="Loading developers…"
      >
        {isFiltered && !loading ? (
          <span className="inline-flex items-center gap-1 text-xs">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            filtered view — copy the URL to share it
          </span>
        ) : null}
      </ResultCount>

      <div className="mt-6">
        {loading ? (
          <GridSkeleton count={6} />
        ) : error ? (
          <SetupNotice error={error} what="Developer profiles" onRetry={refetch} />
        ) : shown.length ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((profile) => (
                <DeveloperCard
                  key={profile.id}
                  profile={profile}
                  featured={profile.featured && !isFiltered}
                />
              ))}
            </div>
            <LoadMore
              total={results.length}
              visible={shown.length}
              onMore={() => setVisible((v) => v + PAGE_SIZE)}
              step={PAGE_SIZE}
            />
          </>
        ) : (
          <EmptyState
            icon={Users}
            level={2}
            title={isFiltered ? "No developers match those filters" : "The directory is empty"}
            description={
              isFiltered
                ? "Try a different skill, clear the search box, or browse everyone on the hub."
                : "No one has published a profile yet. Sign in with Google and claim the first spot."
            }
            action={
              isFiltered ? (
                <Button
                  variant="ghost"
                  icon={X}
                  onClick={() => {
                    setQuery("");
                    reset();
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button to="/dashboard" icon={UserPlus}>
                  Create my profile
                </Button>
              )
            }
            secondary={
              isFiltered ? (
                <Link to="/developers" className="text-sm font-semibold text-brand-300 hover:underline">
                  Browse all developers
                </Link>
              ) : null
            }
          />
        )}
      </div>

      {!loading && !error && results.length ? (
        <p className="mt-10 flex items-center gap-2 text-xs text-muted">
          <Sparkles className="h-3.5 w-3.5 text-brand-300" aria-hidden="true" />
          Tip: press <kbd className="rounded border border-line-strong px-1 font-mono">/</kbd> to search, or{" "}
          <kbd className="rounded border border-line-strong px-1 font-mono">⌘K</kbd> for the command palette.
        </p>
      ) : null}
    </div>
  );
}
