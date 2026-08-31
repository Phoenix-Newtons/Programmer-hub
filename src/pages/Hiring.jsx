import { useMemo, useState } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { X, BadgeCheck, Banknote, Briefcase, Building2, CheckCircle2, Clock, Filter, Rocket, Search, SearchCheck, ShieldCheck, Sparkles, Users, Zap } from "lucide-react";
import PageHeading from "../components/layout/PageHeading";
import SectionHeading from "../components/ui/SectionHeading";
import JobCard from "../components/cards/JobCard";
import EmptyState from "../components/ui/EmptyState";
import SetupNotice from "../components/ui/SetupNotice";
import Button from "../components/ui/Button";
import Accordion from "../components/ui/Accordion";
import FilterPills from "../components/ui/FilterPills";
import { GridSkeleton } from "../components/ui/Skeletons";
import GoogleButton from "../components/auth/GoogleButton";
import JobFormModal from "../components/hiring/JobFormModal";
import ApplyModal from "../components/hiring/ApplyModal";
import useCollection from "../hooks/useCollection";
import { fetchJobs } from "../lib/api";
import { JOB_TYPES, SITE } from "../lib/site";
import { useAuth } from "../context/AuthContext";
import { normalizeList } from "../lib/utils";

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
  { icon: Building2, title: "Post the role", text: "Add the stack, budget, seniority and where applications should land." },
  { icon: Users, title: "Get applications", text: "Developers apply from the board with a short note and portfolio link." },
  { icon: CheckCircle2, title: "Hire directly", text: "Shortlist, message and agree terms — no platform middleman." },
];

const FAQS = [
  {
    question: "How much does it cost to post a role?",
    answer: "Nothing. Posting a role on Programmer's Hub is free and stays live until you delete it from your dashboard.",
  },
  {
    question: "Do you take a commission on hires?",
    answer: "No. The hub is a discovery layer — you and the developer agree on rates and payment terms directly.",
  },
  {
    question: "How are developers verified?",
    answer: "Every profile is tied to a Supabase auth identity (Google or email). Profiles marked verified have been reviewed by the hub team.",
  },
  {
    question: "Can I hire for part-time or contract work?",
    answer: "Yes. Choose Full-time, Part-time, Contract, Freelance or Internship when posting, and state the budget range up front.",
  },
  {
    question: "Where do applications go?",
    answer: "Straight to the contact email on the role, and they're also stored in the applications table so you can review them in Supabase.",
  },
];

export default function Hiring() {
  useDocumentTitle("Hiring board");
  const { isAuthenticated } = useAuth();
  const { data, error, loading, refetch } = useCollection(fetchJobs);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [applyJob, setApplyJob] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((job) => {
      const skills = normalizeList(job.skills).map((skill) => skill.toLowerCase());
      const haystack = [job.title, job.company, job.location, job.description, ...skills]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !q || haystack.includes(q);
      const matchesType = type === "All" || job.type === type;
      return matchesQuery && matchesType;
    });
  }, [data, query, type]);

  const hasFilters = Boolean(query.trim()) || type !== "All";

  return (
    <div className="container-page py-12 sm:py-16">
      <PageHeading
        eyebrow="Hiring board"
        icon={Briefcase}
        title="Hire builders who already shipped."
        description="Post a role in under a minute and reach developers with proven work on the hub. No recruiters, no placement fees, no gatekeeping."
      >
        {isAuthenticated ? (
          <Button icon={Rocket} onClick={() => setJobFormOpen(true)}>
            Post a role
          </Button>
        ) : (
          <GoogleButton redirectTo={`${window.location.origin}/hiring`} />
        )}
      </PageHeading>

      {/* Why hire here */}
      <section className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {REASONS.map((reason) => (
          <div key={reason.title} className="card card-hover p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-line-strong bg-brand-500/10 text-brand-300">
              <reason.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-base font-bold text-ink">{reason.title}</h3>
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
                  <step.icon className="h-5 w-5" />
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
      <section className="mt-16">
        <SectionHeading
          eyebrow="Open roles"
          icon={Briefcase}
          title="Roles hiring right now"
          description="Filter by engagement type, then apply in a couple of clicks."
        />

        <div className="card mt-8 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                className="field pl-11"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search roles, companies or stacks…"
                aria-label="Search roles"
              />
            </label>
            {hasFilters ? (
              <Button
                variant="ghost"
                icon={X}
                onClick={() => {
                  setQuery("");
                  setType("All");
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <Filter className="h-4 w-4 shrink-0 text-muted" />
            <FilterPills options={["All", ...JOB_TYPES]} value={type} onChange={setType} />
          </div>
        </div>

        <p className="mt-6 text-sm text-muted">
          {loading ? "Loading roles…" : `${filtered.length} role${filtered.length === 1 ? "" : "s"} available`}
        </p>

        <div className="mt-6">
          {loading ? (
            <GridSkeleton count={3} />
          ) : error ? (
            <SetupNotice error={error} what="Job listings" onRetry={refetch} />
          ) : filtered.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((job) => (
                <JobCard key={job.id} job={job} onApply={setApplyJob} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Briefcase}
              tone="amber"
              title={hasFilters ? "No roles match those filters" : "No open roles yet"}
              description={
                hasFilters
                  ? "Try a different engagement type or clear your search."
                  : "Post the first role on the hub and start receiving applications from developers with shipped work."
              }
              action={
                hasFilters ? (
                  <Button
                    variant="ghost"
                    icon={X}
                    onClick={() => {
                      setQuery("");
                      setType("All");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : isAuthenticated ? (
                  <Button icon={Rocket} onClick={() => setJobFormOpen(true)}>
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
            <BadgeCheck className="h-3.5 w-3.5" />
            Looking for work?
          </span>
          <h3 className="mt-5 text-2xl font-black tracking-tight text-ink">
            Get in front of companies that are hiring today.
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Complete your profile, flip on &ldquo;open to work&rdquo;, publish at least one project and
            apply to roles with a short note. Developers with shipped work get replies first.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button to="/dashboard" icon={Users}>
              Complete my profile
            </Button>
            <Button to="/projects" variant="ghost" icon={Rocket}>
              Publish a project
            </Button>
          </div>
        </div>

        <div className="card p-7">
          <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
            <Clock className="h-5 w-5 text-brand-300" />
            Hiring FAQs
          </h3>
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
          <Accordion items={FAQS} />
        </div>
      </section>

      <JobFormModal open={jobFormOpen} onClose={() => setJobFormOpen(false)} onSaved={refetch} />
      <ApplyModal open={Boolean(applyJob)} job={applyJob} onClose={() => setApplyJob(null)} />
    </div>
  );
}
