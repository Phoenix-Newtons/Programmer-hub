import { useMemo, useState } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { X, FolderGit2, Plus, Search, Sparkles, Users } from "lucide-react";
import PageHeading from "../components/layout/PageHeading";
import SectionHeading from "../components/ui/SectionHeading";
import ProjectCard from "../components/cards/ProjectCard";
import FilterPills from "../components/ui/FilterPills";
import EmptyState from "../components/ui/EmptyState";
import SetupNotice from "../components/ui/SetupNotice";
import Button from "../components/ui/Button";
import { GridSkeleton } from "../components/ui/Skeletons";
import ProjectFormModal from "../components/projects/ProjectFormModal";
import GoogleButton from "../components/auth/GoogleButton";
import useCollection from "../hooks/useCollection";
import { fetchProjects } from "../lib/api";
import { SHOWCASE_PROJECTS } from "../data/showcase";
import { PROJECT_FILTERS } from "../lib/site";
import { normalizeList } from "../lib/utils";
import { useAuth } from "../context/AuthContext";

export default function Projects() {
  useDocumentTitle("Projects");
  const { isAuthenticated } = useAuth();
  const { data, error, loading, refetch } = useCollection(fetchProjects);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [formOpen, setFormOpen] = useState(false);

  const matches = (project, q, cat) => {
    const tags = normalizeList(project.tags).map((tag) => tag.toLowerCase());
    const haystack = [project.title, project.description, project.author_name, ...tags]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesQuery = !q || haystack.includes(q);
    const matchesCategory = cat === "All" || tags.includes(cat.toLowerCase());
    return matchesQuery && matchesCategory;
  };

  const featured = useMemo(
    () => [...data.filter((project) => project.featured), ...SHOWCASE_PROJECTS].filter((project) =>
      matches(project, query.trim().toLowerCase(), category)
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, query, category]
  );

  const community = useMemo(
    () =>
      data
        .filter((project) => !project.featured)
        .filter((project) => matches(project, query.trim().toLowerCase(), category)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, query, category]
  );

  const hasFilters = Boolean(query.trim()) || category !== "All";

  return (
    <div className="container-page py-12 sm:py-16">
      <PageHeading
        eyebrow="Projects"
        icon={FolderGit2}
        title="Proof of work, not promises."
        description="Featured builds from the hub and projects published by the community. Filter by stack, open the repo, and see how it was built."
      >
        {isAuthenticated ? (
          <Button icon={Plus} onClick={() => setFormOpen(true)}>
            Publish a project
          </Button>
        ) : (
          <GoogleButton redirectTo={`${window.location.origin}/projects`} />
        )}
      </PageHeading>

      {/* Filters */}
      <div className="card mt-10 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="field pl-11"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects, stacks or builders…"
              aria-label="Search projects"
            />
          </label>
          {hasFilters ? (
            <Button
              variant="ghost"
              icon={X}
              onClick={() => {
                setQuery("");
                setCategory("All");
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
        <div className="mt-4">
          <FilterPills options={PROJECT_FILTERS} value={category} onChange={setCategory} />
        </div>
      </div>

      {error ? (
        <div className="mt-10">
          <SetupNotice error={error} what="Projects" onRetry={refetch} />
        </div>
      ) : null}

      {/* Featured builds */}
      <section className="mt-14">
        <SectionHeading
          eyebrow="Featured"
          icon={Sparkles}
          title="Built by Luwangula Alpha"
          description="The hub's own open-source builds — the platform, its Postgres schema and the lucide-powered UI kit. Fork them, learn from them, or ship something better."
        />

        <div className="mt-8">
          {loading ? (
            <GridSkeleton count={3} />
          ) : featured.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              tone="amber"
              title="No featured builds match those filters"
              description="Try another category or clear your search to see every featured project."
            />
          )}
        </div>
      </section>

      {/* Community submissions */}
      <section className="mt-16">
        <SectionHeading
          eyebrow="Community"
          icon={Users}
          title="Published by the hub community"
          description="Every signed-in member can publish shipped work with repo and live links."
          action={
            isAuthenticated ? (
              <Button variant="ghost" icon={Plus} onClick={() => setFormOpen(true)}>
                Add mine
              </Button>
            ) : null
          }
        />

        <div className="mt-8">
          {loading ? (
            <GridSkeleton count={3} />
          ) : error ? null : community.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {community.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FolderGit2}
              tone="emerald"
              title="No community projects yet"
              description="Publish the first one. A repo link, a live URL and a short description is all it takes to stand out here."
              action={
                isAuthenticated ? (
                  <Button icon={Plus} onClick={() => setFormOpen(true)}>
                    Publish a project
                  </Button>
                ) : (
                  <GoogleButton redirectTo={`${window.location.origin}/projects`} />
                )
              }
            />
          )}
        </div>
      </section>

      <ProjectFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={refetch} />
    </div>
  );
}
