import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  FolderGit2,
  Mail,
  MapPin,
  MessageCircle,
  Star,
  UserRound,
  Users,
} from "lucide-react";

import { Github, Linkedin } from "../components/brand/BrandIcons";
import Avatar from "../components/ui/Avatar";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StarRating from "../components/ui/StarRating";
import EmptyState from "../components/ui/EmptyState";
import SaveButton from "../components/ui/SaveButton";
import ShareMenu from "../components/ui/ShareMenu";
import SectionHeading from "../components/ui/SectionHeading";
import ProjectCard from "../components/cards/ProjectCard";
import DeveloperCard from "../components/cards/DeveloperCard";
import { GridSkeleton, ProfileSkeleton } from "../components/ui/Skeletons";
import useCollection from "../hooks/useCollection";
import useDocument from "../hooks/useDocument";
import usePageMeta from "../hooks/usePageMeta";
import { fetchProfile, fetchProfiles, fetchProjects } from "../lib/api";
import { SITE } from "../lib/site";
import { formatDate, hostFromUrl, normalizeList, safeText, waLink, copyToClipboard, timeAgo } from "../lib/utils";
import { useToast } from "../context/ToastContext";

export default function DeveloperProfile() {
  const { id } = useParams();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const profile = useDocument(() => fetchProfile(id), [id]);
  const projects = useCollection(() => fetchProjects({ userId: id }), [id]);
  const directory = useCollection(fetchProfiles);

  const person = profile.data;

  usePageMeta({
    title: person?.name ? `${person.name}${person.title ? ` — ${person.title}` : ""}` : "Developer profile",
    description: person
      ? `${person.name}${person.title ? `, ${person.title}` : ""} — ${(person.bio || "").slice(0, 150) || "Developer profile on Programmer's Hub."}`
      : "Developer profile on Programmer's Hub.",
    type: "profile",
    jsonLd: person
      ? {
          "@context": "https://schema.org",
          "@type": "Person",
          name: person.name,
          jobTitle: person.title || undefined,
          description: person.bio || undefined,
          address: person.location || undefined,
          knowsAbout: normalizeList(person.skills),
          url: typeof window === "undefined" ? undefined : window.location.href,
        }
      : undefined,
  });

  /** Developers who share a skill or city with this profile. */
  const similar = useMemo(() => {
    if (!person) return [];
    const skills = normalizeList(person.skills).map((skill) => skill.toLowerCase());
    const city = String(person.location || "").split(",")[0].trim().toLowerCase();
    return directory.data
      .filter((candidate) => candidate.id !== person.id)
      .map((candidate) => {
        const candidateSkills = normalizeList(candidate.skills).map((skill) => skill.toLowerCase());
        const shared = candidateSkills.filter((skill) => skills.includes(skill)).length;
        const sameCity = city && String(candidate.location || "").toLowerCase().includes(city);
        return { candidate, score: shared * 2 + (sameCity ? 2 : 0) + (candidate.open_to_work ? 1 : 0) };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((entry) => entry.candidate);
  }, [person, directory.data]);

  async function copyEmail() {
    const ok = await copyToClipboard(person.email);
    setCopied(ok);
    if (ok) {
      toast.success("Email address copied.");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Could not copy — select the address manually.");
    }
  }

  if (profile.loading) return <ProfileSkeleton />;

  if (profile.error || !person) {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon={UserRound}
          tone="rose"
          level={1}
          title="Profile not available"
          description="This developer profile could not be loaded. It may have been removed, or the profiles table is not set up yet."
          action={
            <>
              <Button to="/developers" icon={ArrowLeft}>
                Back to directory
              </Button>
              <Button href={`mailto:${SITE.supportEmail}`} variant="ghost" icon={Mail}>
                Contact support
              </Button>
            </>
          }
        />
      </div>
    );
  }

  const skills = normalizeList(person.skills);
  const whatsapp = person.whatsapp ? waLink(person.whatsapp) : "";
  const facts = [
    { icon: MapPin, label: "Location", value: safeText(person.location, "Remote") },
    { icon: Briefcase, label: "Experience", value: safeText(person.experience, "Not stated") },
    { icon: Star, label: "Rating", value: <StarRating rating={person.rating} /> },
    { icon: CalendarDays, label: "Joined", value: `${formatDate(person.created_at) || "recently"}` },
  ];

  return (
    <div className="container-page py-12 sm:py-16">
      <Link
        to="/developers"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-brand-300"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All developers
      </Link>

      {/* Header */}
      <div className="card mt-6 overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-indigo-600/40 via-fuchsia-500/30 to-cyan-400/40" />
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="rounded-3xl border-4 border-bg bg-bg p-1">
                <Avatar
                  name={person.name}
                  src={person.avatar_url}
                  size="xl"
                  status={person.open_to_work ? "open" : null}
                />
              </div>
              <div className="pb-1">
                <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink sm:text-3xl">
                  {safeText(person.name, "Developer")}
                  {person.verified ? (
                    <BadgeCheck className="h-6 w-6 text-brand-300" aria-label="Verified profile" />
                  ) : null}
                </h1>
                <p className="text-sm font-semibold text-brand-300">{safeText(person.title, "Developer")}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {whatsapp ? (
                <Button href={whatsapp} variant="success" icon={MessageCircle}>
                  WhatsApp
                </Button>
              ) : null}
              {person.email ? (
                <Button href={`mailto:${person.email}`} variant="ghost" icon={Mail}>
                  Email
                </Button>
              ) : null}
              <SaveButton profile={person} size="md" />
              <ShareMenu
                title={`${safeText(person.name, "Developer")} on Programmer's Hub`}
                text={`${safeText(person.name, "Developer")}${person.title ? ` — ${person.title}` : ""} is on Programmer's Hub.`}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {person.hourly_rate ? <Badge tone="emerald">{person.hourly_rate}</Badge> : null}
            {person.open_to_work ? (
              <Badge tone="emerald" icon={Briefcase}>
                Open to work
              </Badge>
            ) : (
              <Badge tone="slate">Not looking right now</Badge>
            )}
            {person.featured ? <Badge tone="amber">Featured</Badge> : null}
            {person.verified ? (
              <Badge tone="cyan" icon={BadgeCheck}>
                Verified
              </Badge>
            ) : null}
          </div>

          <p className="mt-6 max-w-3xl whitespace-pre-line text-[0.95rem] leading-relaxed text-ink-soft">
            {safeText(person.bio, "This developer hasn't written a bio yet.")}
          </p>

          {skills.length ? (
            <div className="mt-6">
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Stack</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Link
                    key={skill}
                    to={`/developers?q=${encodeURIComponent(skill)}`}
                    className="chip px-3 py-1.5 text-[0.8rem] transition hover:border-brand-400/50 hover:text-ink"
                    title={`Find more developers who know ${skill}`}
                  >
                    {skill}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {(person.github || person.linkedin || person.website) && (
            <div className="mt-6 flex flex-wrap gap-3">
              {person.github ? (
                <a href={person.github} target="_blank" rel="noopener noreferrer" className="btn btn-ghost text-sm">
                  <Github className="h-4 w-4" aria-hidden="true" />
                  {hostFromUrl(person.github)}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ) : null}
              {person.linkedin ? (
                <a href={person.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn-ghost text-sm">
                  <Linkedin className="h-4 w-4" aria-hidden="true" />
                  LinkedIn
                </a>
              ) : null}
              {person.website ? (
                <a href={person.website} target="_blank" rel="noopener noreferrer" className="btn btn-ghost text-sm">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  {hostFromUrl(person.website)}
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        {/* Main column */}
        <div className="space-y-12">
          <section>
            <SectionHeading
              eyebrow="Portfolio"
              icon={FolderGit2}
              title={`Projects by ${safeText(person.name, "this developer")}`}
              description="Shipped work with repos and live links — the fastest way to judge a builder."
            />
            <div className="mt-6">
              {projects.loading ? (
                <GridSkeleton count={3} columns="sm:grid-cols-2" />
              ) : projects.data.length ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {projects.data.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={FolderGit2}
                  tone="emerald"
                  compact
                  title="No projects published yet"
                  description="Once this developer publishes work, every repo and live link shows up here."
                />
              )}
            </div>
          </section>

          {similar.length ? (
            <section>
              <SectionHeading
                eyebrow="Similar talent"
                icon={Users}
                title="Developers with overlapping skills"
                description="Handy when you're comparing a shortlist or looking for a second pair of hands."
              />
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {similar.map((candidate) => (
                  <DeveloperCard key={candidate.id} profile={candidate} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* Sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted">Quick facts</h2>
            <dl className="mt-4 space-y-3">
              {facts.map((fact) => (
                <div key={fact.label} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-surface text-brand-300">
                    <fact.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted">{fact.label}</dt>
                    <dd className="text-sm font-semibold text-ink-soft">{fact.value}</dd>
                  </div>
                </div>
              ))}
            </dl>

            <p className="mt-4 border-t border-line pt-4 text-xs text-muted">
              Profile updated {timeAgo(person.updated_at || person.created_at) || "recently"}
            </p>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted">Get in touch</h2>
            <div className="mt-4 grid gap-2">
              {whatsapp ? (
                <Button href={whatsapp} variant="success" icon={MessageCircle} fullWidth>
                  Message on WhatsApp
                </Button>
              ) : null}
              {person.email ? (
                <>
                  <Button href={`mailto:${person.email}`} variant="ghost" icon={Mail} fullWidth>
                    Send an email
                  </Button>
                  <Button
                    variant="subtle"
                    icon={copied ? Check : Copy}
                    onClick={copyEmail}
                    fullWidth
                    className="justify-start font-mono text-xs"
                  >
                    {person.email}
                  </Button>
                </>
              ) : null}
              {!person.email && !whatsapp ? (
                <p className="text-sm text-muted">
                  This developer hasn&rsquo;t published contact details. Try their GitHub or LinkedIn links above.
                </p>
              ) : null}
            </div>
            {person.hourly_rate ? (
              <p className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-200">
                Published rate: {person.hourly_rate}
              </p>
            ) : null}
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted">More like this</h2>
            <div className="mt-3 grid gap-2">
              <Button to={`/developers?q=${encodeURIComponent(skills[0] || "")}`} variant="ghost" fullWidth className="justify-start">
                <Users className="h-4 w-4" aria-hidden="true" />
                Who else knows {skills[0] || "this stack"}?
              </Button>
              <Button to="/developers?open=1" variant="ghost" fullWidth className="justify-start">
                <Briefcase className="h-4 w-4" aria-hidden="true" />
                Everyone open to work
              </Button>
              <Button to="/shortlist" variant="ghost" fullWidth className="justify-start">
                <UserRound className="h-4 w-4" aria-hidden="true" />
                My shortlist
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
