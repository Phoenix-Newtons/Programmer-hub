import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Banknote,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Globe,
  Rocket,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";

import PageHeading from "../components/layout/PageHeading";
import SectionHeading from "../components/ui/SectionHeading";
import JobCard from "../components/cards/JobCard";
import EmptyState from "../components/ui/EmptyState";
import SetupNotice from "../components/ui/SetupNotice";
import Button from "../components/ui/Button";
import Accordion from "../components/ui/Accordion";
import FilterPills from "../components/ui/FilterPills";
import SortSelect from "../components/ui/SortSelect";
import SearchInput from "../components/ui/SearchInput";
import ResultCount from "../components/ui/ResultCount";
import LoadMore from "../components/ui/LoadMore";
import ShareMenu from "../components/ui/ShareMenu";
import { GridSkeleton } from "../components/ui/Skeletons";
import GoogleButton from "../components/auth/GoogleButton";
import JobFormModal from "../components/hiring/JobFormModal";
import ApplyModal from "../components/hiring/ApplyModal";
import useCollection from "../hooks/useCollection";
import useDebouncedValue from "../hooks/useDebouncedValue";
import useHotkeys from "../hooks/useHotkeys";
import usePageMeta from "../hooks/usePageMeta";
import useUrlFilters from "../hooks/useUrlFilters";
import { deleteJob, fetchJobs, fetchProfiles } from "../lib/api";
import { JOB_SORTS, JOB_TYPES, PAGE_SIZE, SITE } from "../lib/site";
import { normalizeList, parseRate, sortBy } from "../lib/utils";
import { rankItems } from "../lib/search";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const REASONS = [
  {
    icon: Zap,
    title: "Post in 60 seconds",
    text: "Role title, stack, budget and contact email — that's the whole form. No company verification maze.",
  },
  {
    icon: SearchCheck,
    title: "Skill-matched talent",
    text: "Every developer is searchable by stack, location and availability, so shortlisting takes minutes.",
  },
  {
    icon: Banknote,
    title: "Zero recruiter fees",
    text: "Talk to developers directly through WhatsApp or email. The hub takes no cut of your deal.",
  },
  {
    icon: ShieldCheck,
    title: "Real, verified people",
    text: "Google sign-in and Supabase row-level security keep out anonymous and duplicated profiles.",
  },
];

const STEPS = [
  {
    icon: Building2,
    title: "Post the role",
    text: "Add the stack, budget, seniority and where applications should land.",
  },
  {
    icon: Users,
    title: "Get applications",
    text: "Developers apply from the board with a short note and portfolio link — you read them in your dashboard.",
  },
  {
    icon: CheckCircle2,
    title: "Hire directly",
    text: "Shortlist, message and agree terms — no platform middleman.",
  },
];

const FAQS = [
  {
    question: "How much does it cost to post a role?",
    answer:
      "Nothing. Posting a role on Programmer's Hub is free and stays live until you close or delete it from your dashboard.",
  },
  {
    question: "Do you take a commission on hires?",
    answer:
      "No. The hub is a discovery layer — you and the developer agree on rates and payment terms directly.",
  },
  {
    question: "How are developers verified?",
    answer:
      "Every profile is tied to a Supabase auth identity (Google or email). Profiles marked verified have been reviewed by the hub team.",
  },
  {
    question: "Can I hire for part-time or contract work?",
    answer:
      "Yes. Choose Full-time, Part-time, Contract, Freelance or Internship when posting, and state the budget range up front.",
  },
  {
    question: "Where do applications go?",
    answer:
      "They land in your dashboard under “Applications received” and are also stored in the applications table, which only you can read.",
  },
  {
    question: "How do I close a role once it's filled?",
    answer:
      "Open My roles in the dashboard and switch the role to Closed. Closed roles stay visible but stop accepting applications.",
  },
];

export default function Hiring() {
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();
  const searchRef = useRef(null);

  const { data, error, loading, refetch } = useCollection(fetchJobs);
  const { data: profiles } = useCollection(fetchProfiles);
  const { values, setValues, reset, isFiltered } = useUrlFilters({
    q: "",
    type: "All",
    level: "All",
    remote: "0",
    sort: "recent",
  });

  const [query, setQuery] = useState(values.q);
  const debouncedQuery = useDebouncedValue(query, 250);
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [applyJob, setApplyJob] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    setValues({ q: debouncedQuery });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  useEffect(() => {
    setQuery((current) => (current === values.q ? current : values.q));
  }, [values.q]);

  useHotkeys("/", () => searchRef.current?.focus());

  usePageMeta({
    title: "Hiring board",
    description:
      "Hire builders who already shipped. Post a role for free and reach developers with proven work — no recruiters, no placement fees.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Hiring board — Programmer's Hub",
      description: "Open developer roles with stack, level and budget stated up front.",
      url: SITE.repo,
    },
  });

  const openToWork = useMemo(() => profiles.filter((profile) => profile.open_to_work).length, [profiles]);

  const typeCounts = useMemo(() => {
    const counts = { All: data.length };
    JOB_TYPES.forEach((type) => {
      counts[type] = data.filter((job) => job.type === type).length;
    });
    return counts;
  }, [data]);

  const results = useMemo(() => {
    let pool = data.filter((job) => {
      const matchesType = values.type === "All" || job.type === values.type;
      const matchesLevel = values.level === "All" || job.level === values.level;
      const matchesRemote = values.remote !== "1" || /remote/i.test(String(job.location || ""));
      return matchesType && matchesLevel && matchesRemote;
    });

    if (values.q.trim()) {
      pool = rankItems(pool, values.q, {
        fields: (job) => ({
          title: job.title,
          company: job.company,
          skills: normalizeList(job.skills),
          location: job.location,
          description: job.description,
        }),
        weights: { title: 3, company: 2, skills: 2, location: 1.3, description: 0.8 },
      }).map(({ item }) => item);
    }

    switch (values.sort) {
      case "budget":
        return sortBy(pool, (job) => parseRate(job.budget), "asc");
      case "title":
        return sortBy(pool, (job) => String(job.title || "").toLowerCase());
      default:
        return sortBy(pool, (job) => new Date(job.created_at || 0).getTime(), "desc");
    }
  }, [data, values.q, values.type, values.level, values.remote, values.sort]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [values.q, values.type, values.level, values.remote, values.sort]);

  const shown = results.slice(0, visible);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    const { error: deleteError } = await deleteJob(pendingDelete.id);
    setDeletingId(null);
    setPendingDelete(null);
    if (deleteError) {
      toast.error("Could not delete that role.");
      return;
    }
    toast.success("Role removed.");
    refetch();
  }

  const levels = ["All", "Junior", "Mid-level", "Senior", "Lead"];

  return (
    <div className="container-page py-12 sm:py-16">
      <PageHeading
        eyebrow="Hiring board"
        icon={Briefcase}
        breadcrumbs={[{ label: "Hiring" }]}
        title="Hire builders who already shipped."
        description="Post a role in under a minute and reach developers with proven work on the hub. No recruiters, no placement fees, no gatekeeping."
      >
        <ShareMenu title="Hiring on Programmer's Hub" text="Open roles for developers who ship." />
        {isAuthenticated ? (
          <Button
            icon={Rocket}
            onClick={() => {
              setEditingJob(null);
              setJobFormOpen(true);
            }}
          >
            Post a role
          </Button>
        ) : (
          <GoogleButton redirectTo={`${window.location.origin}/hiring`} />
        )}
      </PageHeading>

      {/* Live talent snapshot */}
      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-4 p-5">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-line-strong bg-emerald-500/10 text-emerald-300">
            <BadgeCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-2xl font-black text-ink">{openToWork}</p>
            <p className="text-xs uppercase tracking-wider text-muted">Developers open to work</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-5">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-line-strong bg-brand-500/10 text-brand-300">
            <Briefcase className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-2xl font-black text-ink">{data.length}</p>
            <p className="text-xs uppercase tracking-wider text-muted">Roles on the board</p>
          </div>
        </div>
        <div className="card flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-bold text-ink">Need a shortlist fast?</p>
            <p className="text-xs text-muted">Filter the directory by availability.</p>
          </div>
          <Button size="sm" variant="ghost" to="/developers?open=1" icon={UserRound}>
            Browse
          </Button>
        </div>
      </section>

      {/* Why hire here */}
      <section className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {REASONS.map((reason) => (
          <div key={reason.title} className="card card-hover p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-line-strong bg-brand-500/10 text-brand-300">
              <reason.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-base font-bold text-ink">{reason.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{reason.text}</p>
          </div>
        ))}
      </section>

      {/* Steps */}
      <section className="mt-16">
        <SectionHeading
          eyebrow="Process"
          icon={Sparkles}
          title="From job post to first commit."
          description="A short, transparent loop that puts you in the room with the developer."
          align="center"
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="card p-6">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
                  <step.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="font-mono text-2xl font-black text-line-strong">0{index + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-bold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Open roles */}
      <section className="mt-16" id="open-roles">
        <SectionHeading
          eyebrow="Open roles"
          icon={Briefcase}
          title="Roles hiring right now"
          description="Filter by engagement type, level or remote work, then apply in a couple of clicks."
        />

        <div className="card mt-8 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <SearchInput
              ref={searchRef}
              value={query}
              onChange={setQuery}
              placeholder="Search roles, companies or stacks…"
              label="Search roles"
              hint="/"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setValues({ remote: values.remote === "1" ? "0" : "1" })}
                aria-pressed={values.remote === "1"}
                className={`btn ${
                  values.remote === "1"
                    ? "border-transparent bg-cyan-500/20 text-cyan-200"
                    : "border-line-strong bg-surface text-muted hover:text-ink"
                }`}
              >
                <Globe className="h-4 w-4" aria-hidden="true" />
                Remote only
              </button>
              <SortSelect options={JOB_SORTS} value={values.sort} onChange={(sort) => setValues({ sort })} />
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

          <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:gap-4">
            <FilterPills
              options={JOB_TYPES}
              value={values.type}
              onChange={(type) => setValues({ type })}
              counts={typeCounts}
              ariaLabel="Filter by engagement type"
              className="no-scrollbar"
            />
            <div className="hidden h-6 w-px bg-line sm:block" />
            <FilterPills
              options={levels}
              value={values.level}
              onChange={(level) => setValues({ level })}
              ariaLabel="Filter by seniority"
              className="no-scrollbar"
            />
          </div>
        </div>

        <ResultCount
          className="mt-6"
          count={results.length}
          singular="role available"
          plural="roles available"
          loading={loading}
          loadingLabel="Loading roles…"
        />

        <div className="mt-6">
          {loading ? (
            <GridSkeleton count={3} />
          ) : error ? (
            <SetupNotice error={error} what="Job listings" onRetry={refetch} />
          ) : shown.length ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onApply={setApplyJob}
                    onEdit={
                      isAuthenticated && job.user_id === user?.id
                        ? (item) => {
                            setEditingJob(item);
                            setJobFormOpen(true);
                          }
                        : undefined
                    }
                    onDelete={isAuthenticated && job.user_id === user?.id ? setPendingDelete : undefined}
                    deleting={deletingId === job.id}
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
              icon={Briefcase}
              tone="amber"
              title={isFiltered ? "No roles match those filters" : "No open roles yet"}
              description={
                isFiltered
                  ? "Try a different engagement type, level or clear the search."
                  : "Post the first role on the hub and start receiving applications from developers with shipped work."
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
                    icon={Rocket}
                    onClick={() => {
                      setEditingJob(null);
                      setJobFormOpen(true);
                    }}
                  >
                    Post a role
                  </Button>
                ) : (
                  <GoogleButton redirectTo={`${window.location.origin}/hiring`} />
                )
              }
            />
          )}
        </div>
      </section>

      {/* For developers */}
      <section className="mt-16 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-300">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Looking for work?
          </span>
          <h2 className="mt-5 text-2xl font-black tracking-tight text-ink">
            Get in front of companies that are hiring today.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Complete your profile, flip on &ldquo;open to work&rdquo;, publish at least one project and apply
            to roles with a short note. Developers with shipped work get replies first.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button to="/dashboard" icon={Users}>
              Complete my profile
            </Button>
            <Button to="/projects" variant="ghost" icon={Rocket}>
              Publish a project
            </Button>
            <Link to="/developers?open=1" className="btn btn-subtle text-sm">
              See who else is available
            </Link>
          </div>
        </div>

        <div className="card p-7">
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
            <Clock className="h-5 w-5 text-brand-300" aria-hidden="true" />
            Hiring FAQs
          </h2>
          <div className="mt-5">
            <Accordion items={FAQS.slice(0, 3)} />
          </div>
          <Button
            href={`mailto:${SITE.supportEmail}?subject=Hiring%20enquiry`}
            variant="ghost"
            size="sm"
            className="mt-4"
          >
            Ask the hub team
          </Button>
        </div>
      </section>

      {/* Full FAQ */}
      <section className="mt-16">
        <SectionHeading eyebrow="FAQ" icon={CheckCircle2} title="Everything else you might wonder" />
        <div className="mt-8">
          <Accordion items={FAQS} defaultOpen={null} />
        </div>
      </section>

      <JobFormModal
        open={jobFormOpen}
        job={editingJob}
        onClose={() => {
          setJobFormOpen(false);
          setEditingJob(null);
        }}
        onSaved={refetch}
      />
      <ApplyModal open={Boolean(applyJob)} job={applyJob} onClose={() => setApplyJob(null)} />

      {/* Delete confirmation */}
      {pendingDelete ? (
        <div className="fixed inset-0 z-[92] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setPendingDelete(null)}
            aria-hidden="true"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-role-title"
            className="relative w-full max-w-md rounded-2xl border border-line-strong bg-surface-solid p-6 shadow-2xl"
          >
            <h2 id="delete-role-title" className="text-lg font-bold text-ink">
              Delete “{pendingDelete.title}”?
            </h2>
            <p className="mt-2 text-sm text-muted">
              The role and its applications disappear from the board. Consider marking it Closed instead if
              you want to keep the record.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPendingDelete(null)}>
                Keep it
              </Button>
              <Button variant="danger" onClick={confirmDelete} loading={deletingId === pendingDelete.id}>
                Delete role
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
