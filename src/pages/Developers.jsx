import { useMemo, useState } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { X, Briefcase, Search, SlidersHorizontal, UserPlus, Users } from "lucide-react";
import PageHeading from "../components/layout/PageHeading";
import DeveloperCard from "../components/cards/DeveloperCard";
import FilterPills from "../components/ui/FilterPills";
import EmptyState from "../components/ui/EmptyState";
import SetupNotice from "../components/ui/SetupNotice";
import Button from "../components/ui/Button";
import { GridSkeleton } from "../components/ui/Skeletons";
import useCollection from "../hooks/useCollection";
import { fetchProfiles } from "../lib/api";
import { SKILL_FILTERS } from "../lib/site";
import { normalizeList } from "../lib/utils";

export default function Developers() {
  useDocumentTitle("Developers");
  const { data, error, loading, refetch } = useCollection(fetchProfiles);
  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState("All");
  const [openOnly, setOpenOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((profile) => {
      const skills = normalizeList(profile.skills).map((s) => s.toLowerCase());
      const haystack = [profile.name, profile.title, profile.location, profile.bio, ...skills]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !q || haystack.includes(q);
      const matchesSkill = skill === "All" || skills.includes(skill.toLowerCase());
      const matchesOpen = !openOnly || Boolean(profile.open_to_work);
      return matchesQuery && matchesSkill && matchesOpen;
    });
  }, [data, query, skill, openOnly]);

  const hasFilters = Boolean(query) || skill !== "All" || openOnly;

  function resetFilters() {
    setQuery("");
    setSkill("All");
    setOpenOnly(false);
  }

  return (
    <div className="container-page py-12 sm:py-16">
      <PageHeading
        eyebrow="Directory"
        icon={Users}
        title="Find a developer by stack, not by CV."
        description="Every profile below lives in Supabase and belongs to a real signed-in member. Search by skill, title or location, then reach out directly."
      >
        <Button to="/dashboard" icon={UserPlus}>
          Create my profile
        </Button>
      </PageHeading>

      {/* Search + filters */}
      <div className="card mt-10 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="field pl-11"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search React, Kampala, backend…"
              aria-label="Search developers"
            />
          </label>

          <button
            type="button"
            onClick={() => setOpenOnly((value) => !value)}
            aria-pressed={openOnly}
            className={`btn ${
              openOnly
                ? "border-transparent bg-emerald-500/20 text-emerald-300"
                : "border-line-strong bg-surface text-muted hover:text-ink"
            }`}
          >
            <Briefcase className="h-4 w-4" />
            Open to work
          </button>

          {hasFilters ? (
            <button type="button" onClick={resetFilters} className="btn btn-ghost">
              <X className="h-4 w-4" />
              Clear
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted" />
          <FilterPills options={SKILL_FILTERS} value={skill} onChange={setSkill} />
        </div>
      </div>

      <p className="mt-6 text-sm text-muted">
        {loading ? "Loading developers…" : `${filtered.length} developer${filtered.length === 1 ? "" : "s"} found`}
      </p>

      <div className="mt-6">
        {loading ? (
          <GridSkeleton count={6} />
        ) : error ? (
          <SetupNotice error={error} what="Developer profiles" onRetry={refetch} />
        ) : filtered.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((profile) => (
              <DeveloperCard key={profile.id} profile={profile} featured={profile.featured} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title={hasFilters ? "No developers match those filters" : "The directory is empty"}
            description={
              hasFilters
                ? "Try a different skill, clear the search box, or browse everyone on the hub."
                : "No one has published a profile yet. Sign in with Google and claim the first spot."
            }
            action={
              hasFilters ? (
                <Button variant="ghost" onClick={resetFilters} icon={X}>
                  Clear filters
                </Button>
              ) : (
                <Button to="/dashboard" icon={UserPlus}>
                  Create my profile
                </Button>
              )
            }
          />
        )}
      </div>
    </div>
  );
}
