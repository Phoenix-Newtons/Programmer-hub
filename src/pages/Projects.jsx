import { useEffect, useMemo, useRef, useState } from "react";
import { FolderGit2, Plus, Sparkles, Users, X } from "lucide-react";

import PageHeading from "../components/layout/PageHeading";
import SectionHeading from "../components/ui/SectionHeading";
import ProjectCard from "../components/cards/ProjectCard";
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
import ProjectFormModal from "../components/projects/ProjectFormModal";
import GoogleButton from "../components/auth/GoogleButton";
import useCollection from "../hooks/useCollection";
import useDebouncedValue from "../hooks/useDebouncedValue";
import useHotkeys from "../hooks/useHotkeys";
import usePageMeta from "../hooks/usePageMeta";
import useUrlFilters from "../hooks/useUrlFilters";
import { deleteProject, fetchProjects } from "../lib/api";
import { SHOWCASE_PROJECTS } from "../data/showcase";
import { PAGE_SIZE, PROJECT_FILTERS, PROJECT_SORTS, SITE } from "../lib/site";
import { normalizeList, sortBy } from "../lib/utils";
import { rankItems } from "../lib/search";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Projects() {
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();
  const searchRef = useRef(null);

  const { data, error, loading, refetch } = useCollection(fetchProjects);
  const { values, setValues, reset, isFiltered } = useUrlFilters({ q: "", category: "All", sort: "recent" });

  const [query, setQuery] = useState(values.q);
  const debouncedQuery = useDebouncedValue(query, 250);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    setValues({ q: debouncedQuery });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  useEffect(() => {
    setQuery((current) => (current === values.q ? current : values.q));
  }, [values.q]);

  useHotkeys("/", () => searchRef.current?.focus());

  usePageMeta({
    title: "Projects",
    description:
      "Proof of work, not promises — featured builds from the hub plus projects published by the community, with repos and live links.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Projects on Programmer's Hub",
      description: "Shipped work from the hub's developer community.",
      url: SITE.repo,
    },
  });

  const matches = (project, q, category) => {
    const tags = normalizeList(project.tags).map((tag) => tag.toLowerCase());
    const matchesCategory = category === "All" || tags.includes(category.toLowerCase());
    if (!matchesCategory) return false;
    if (!q) return true;
    const found = rankItems([project], q, {
      fields: (item) => ({
        title: item.title,
        tags: normalizeList(item.tags),
        author_name: item.author_name,
        description: item.description,
      }),
      weights: { title: 3, tags: 2, author_name: 1.5, description: 0.8 },
    });
    return found.length > 0;
  };

  /** Featured = showcase builds + anything flagged featured in the database. */
  const featuredPool = useMemo(() => {
    const own = data.filter((project) => project.featured);
    const showcaseIds = new Set(own.map((project) => project.id));
    return [...own, ...SHOWCASE_PROJECTS.filter((project) => !showcaseIds.has(project.id))];
  }, [data]);

  const communityPool = useMemo(() => data.filter((project) => !project.featured), [data]);

  const applySort = (list) => {
    switch (values.sort) {
      case "title":
        return sortBy(list, (project) => String(project.title || "").toLowerCase());
      case "featured":
        return sortBy(list, (project) => Boolean(project.featured), "desc");
      default:
        return sortBy(list, (project) => new Date(project.created_at || 0).getTime(), "desc");
    }
  };

  const featured = useMemo(
    () => applySort(featuredPool.filter((project) => matches(project, values.q.trim(), values.category))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [featuredPool, values.q, values.category, values.sort]
  );

  const community = useMemo(
    () => applySort(communityPool.filter((project) => matches(project, values.q.trim(), values.category))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [communityPool, values.q, values.category, values.sort]
  );

  const categoryCounts = useMemo(() => {
    const all = [...featuredPool, ...communityPool];
    const counts = { All: all.length };
    PROJECT_FILTERS.filter((category) => category !== "All").forEach((category) => {
      counts[category] = all.filter((project) =>
        normalizeList(project.tags).some((tag) => tag.toLowerCase() === category.toLowerCase())
      ).length;
    });
    return counts;
  }, [featuredPool, communityPool]);

  const [visible, setVisible] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [values.q, values.category, values.sort]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    const { error: deleteError } = await deleteProject(pendingDelete.id);
    setDeletingId(null);
    setPendingDelete(null);
    if (deleteError) {
      toast.error("Could not delete that project.");
      return;
    }
    toast.success("Project removed.");
    refetch();
  }

  const total = featured.length + community.length;
  const shownCommunity = community.slice(0, Math.max(visible - featured.length, 0));

  return (
    <div className="container-page py-12 sm:py-16">
      <PageHeading
        eyebrow="Projects"
        icon={FolderGit2}
        breadcrumbs={[{ label: "Projects" }]}
        title="Proof of work, not promises."
        description="Featured builds from the hub and projects published by the community. Filter by stack, open the repo, and see how it was built."
      >
        <ShareMenu title="Projects on Programmer's Hub" text="Shipped work from the hub's community." />
        {isAuthenticated ? (
          <Button
            icon={Plus}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Publish a project
          </Button>
        ) : (
          <GoogleButton redirectTo={`${window.location.origin}/projects`} />
        )}
      </PageHeading>

      {/* Filters */}
      <div className="card mt-10 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <SearchInput
            ref={searchRef}
            value={query}
            onChange={setQuery}
            placeholder="Search projects, stacks or builders…"
            label="Search projects"
            hint="/"
          />
          <div className="flex flex-wrap items-center gap-2">
            <SortSelect options={PROJECT_SORTS} value={values.sort} onChange={(sort) => setValues({ sort })} />
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
        <div className="mt-4 border-t border-line pt-4">
          <FilterPills
            options={PROJECT_FILTERS}
            value={values.category}
            onChange={(category) => setValues({ category })}
            counts={categoryCounts}
            ariaLabel="Filter by category"
            className="no-scrollbar"
          />
        </div>
      </div>

      {error ? (
        <div className="mt-10">
          <SetupNotice error={error} what="Projects" onRetry={refetch} />
        </div>
      ) : null}

      <ResultCount
        className="mt-6"
        count={total}
        singular="project found"
        plural="projects found"
        loading={loading}
        loadingLabel="Loading projects…"
      />

      {/* Featured builds */}
      <section className="mt-12">
        <SectionHeading
          eyebrow="Featured"
          icon={Sparkles}
          title={`Built by ${SITE.createdBy}`}
          description="The hub's own open-source builds — the platform, its Postgres schema and the lucide-powered UI kit. Fork them, learn from them, or ship something better."
        />

        <div className="mt-8">
          {loading ? (
            <GridSkeleton count={3} />
          ) : featured.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  tagLink
                  onEdit={
                    isAuthenticated && project.user_id === user?.id
                      ? (item) => {
                          setEditing(item);
                          setFormOpen(true);
                        }
                      : undefined
                  }
                  onDelete={
                    isAuthenticated && project.user_id === user?.id ? setPendingDelete : undefined
                  }
                  deleting={deletingId === project.id}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              tone="amber"
              title="No featured builds match those filters"
              description="Try another category or clear your search to see every featured project."
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
                ) : null
              }
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
              <Button
                variant="ghost"
                icon={Plus}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Add mine
              </Button>
            ) : null
          }
        />

        <div className="mt-8">
          {loading ? (
            <GridSkeleton count={3} />
          ) : error ? null : community.length ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {shownCommunity.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    tagLink
                    onEdit={
                      isAuthenticated && project.user_id === user?.id
                        ? (item) => {
                            setEditing(item);
                            setFormOpen(true);
                          }
                        : undefined
                    }
                    onDelete={
                      isAuthenticated && project.user_id === user?.id ? setPendingDelete : undefined
                    }
                    deleting={deletingId === project.id}
                  />
                ))}
              </div>
              <LoadMore
                total={community.length}
                visible={shownCommunity.length}
                onMore={() => setVisible((v) => v + PAGE_SIZE)}
                step={PAGE_SIZE}
              />
            </>
          ) : (
            <EmptyState
              icon={FolderGit2}
              tone="emerald"
              title={isFiltered ? "No community projects match those filters" : "No community projects yet"}
              description={
                isFiltered
                  ? "Try another category, or clear the search to see everything the community has shipped."
                  : "Publish the first one. A repo link, a live URL and a short description is all it takes to stand out here."
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
                ) : isAuthenticated ? (
                  <Button
                    icon={Plus}
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
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

      <ProjectFormModal
        open={formOpen}
        project={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={refetch}
      />

      {/* Delete confirmation */}
      {pendingDelete ? (
        <div className="fixed inset-0 z-[92] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setPendingDelete(null)} aria-hidden="true" />
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-project-title" className="relative w-full max-w-md rounded-2xl border border-line-strong bg-surface-solid p-6 shadow-2xl">
            <h2 id="delete-project-title" className="text-lg font-bold text-ink">
              Delete “{pendingDelete.title}”?
            </h2>
            <p className="mt-2 text-sm text-muted">
              This removes the project from the hub for everyone. It can&rsquo;t be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPendingDelete(null)}>
                Keep it
              </Button>
              <Button variant="danger" onClick={confirmDelete} loading={deletingId === pendingDelete.id}>
                Delete project
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
