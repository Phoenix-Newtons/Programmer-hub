import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookmarkCheck,
  Briefcase as BriefcaseIcon,
  Download,
  Mail,
  MessageCircle,
  Trash2,
  Users,
} from "lucide-react";

import PageHeading from "../components/layout/PageHeading";
import DeveloperCard from "../components/cards/DeveloperCard";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import ResultCount from "../components/ui/ResultCount";
import SortSelect from "../components/ui/SortSelect";
import ShareMenu from "../components/ui/ShareMenu";
import { RowSkeleton } from "../components/ui/Skeletons";
import useCollection from "../hooks/useCollection";
import usePageMeta from "../hooks/usePageMeta";
import { fetchProfiles } from "../lib/api";
import { clearShortlist, getShortlistWhatsApps, shortlistMailto, useShortlist } from "../lib/shortlist";
import { useToast } from "../context/ToastContext";
import { DEVELOPER_SORTS } from "../lib/site";
import { downloadFile, normalizeList, parseRate, sortBy, toCsv } from "../lib/utils";

const SORTS = [
  { id: "saved", label: "Recently saved" },
  ...DEVELOPER_SORTS.filter((option) => option.id !== "relevance"),
];

/**
 * Private shortlist — stored in this browser only. It renders from the stored
 * snapshots first and swaps in live profile data when Supabase answers.
 */
export default function Shortlist() {
  usePageMeta({
    title: "Shortlist",
    description: "Developers you saved while browsing Programmer's Hub. Private to this browser.",
    noIndex: true,
  });

  const shortlist = useShortlist();
  const toast = useToast();
  const [sort, setSort] = useState("saved");
  const idsKey = shortlist.ids.join(",");
  const { data, loading } = useCollection(() => fetchProfiles({ ids: shortlist.ids }), [idsKey]);

  const items = useMemo(() => {
    const live = new Map(data.map((profile) => [profile.id, profile]));
    const merged = shortlist.list.map((entry) => ({ ...entry, ...(live.get(entry.id) || {}) }));
    switch (sort) {
      case "rating":
        return sortBy(merged, (item) => Number(item.rating) || 0, "desc");
      case "rate-low":
        return sortBy(merged, (item) => parseRate(item.hourly_rate));
      case "name":
        return sortBy(merged, (item) => String(item.name || "").toLowerCase());
      case "newest":
        return sortBy(merged, (item) => new Date(item.created_at || item.saved_at || 0).getTime(), "desc");
      default:
        return merged;
    }
  }, [shortlist.list, data, sort]);

  function exportCsv() {
    if (!items.length) return;
    const csv = toCsv(items, [
      { key: "name", label: "Name" },
      { key: "title", label: "Headline" },
      { key: "location", label: "Location" },
      { key: "hourly_rate", label: "Rate" },
      { key: "email", label: "Email" },
      { key: "whatsapp", label: "WhatsApp" },
      { key: "skills", label: "Skills", value: (row) => normalizeList(row.skills).join("; ") },
      { key: "profile", label: "Profile", value: (row) => `${window.location.origin}/developers/${row.id}` },
    ]);
    const ok = downloadFile(
      `shortlist-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      "text/csv;charset=utf-8"
    );
    if (ok) toast.success("Shortlist exported as CSV.");
    else toast.error("Export failed in this browser.");
  }

  /** Bulk email / WhatsApp drafts for everyone on the list. */
  function contactAll(kind) {
    if (kind === "email") {
      const href = shortlistMailto(items);
      if (!href) {
        toast.warning("Nobody on your shortlist has shared an email.");
        return;
      }
      window.location.href = href;
      return;
    }

    const [first] = getShortlistWhatsApps(items);
    if (!first) {
      toast.warning("Nobody on your shortlist has shared a WhatsApp number.");
      return;
    }
    window.location.href = `https://wa.me/${first}`;
  }

  const hasItems = items.length > 0;

  return (
    <div className="container-page py-12 sm:py-16">
      <PageHeading
        eyebrow="Shortlist"
        icon={BookmarkCheck}
        breadcrumbs={[{ label: "Shortlist" }]}
        title="The developers you're considering."
        description="Saved privately in this browser — no account needed and nothing is shared until you contact them."
      >
        {hasItems ? (
          <>
            <SortSelect options={SORTS} value={sort} onChange={setSort} label="Sort" />
            <ShareMenu
              title="My shortlist on Programmer's Hub"
              text="Developers I'm considering right now."
            />
            <Button variant="ghost" icon={Download} onClick={exportCsv}>
              Export CSV
            </Button>
            <Button
              variant="ghost"
              icon={Trash2}
              className="text-rose-300"
              onClick={() => {
                clearShortlist();
                toast.info("Shortlist cleared.");
              }}
            >
              Clear all
            </Button>
          </>
        ) : null}
      </PageHeading>

      {hasItems ? (
        <>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button icon={Mail} variant="ghost" onClick={() => contactAll("email")}>
              Email everyone
            </Button>
            <Button icon={MessageCircle} variant="ghost" onClick={() => contactAll("whatsapp")}>
              WhatsApp first match
            </Button>
            <Button as="link" to="/hiring" variant="ghost" icon={BriefcaseIcon}>
              Compare with open roles
            </Button>
          </div>

          <ResultCount
            className="mt-6"
            count={items.length}
            singular="developer saved"
            plural="developers saved"
            loading={loading && !shortlist.list.length}
            loadingLabel="Loading your shortlist…"
          />

          <div className="mt-6 space-y-3">
            {loading && !shortlist.list.length ? (
              <RowSkeleton count={3} />
            ) : (
              items.map((item) => <DeveloperCard key={item.id} profile={item} compact className="!p-4" />)
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
            <p className="flex items-start gap-2">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
              Shortlists live in this browser&rsquo;s storage. Export the CSV before switching devices — or
              share your profile links instead.
            </p>
          </div>
        </>
      ) : (
        <div className="mt-10">
          <EmptyState
            icon={BookmarkCheck}
            tone="amber"
            level={2}
            title="Nothing shortlisted yet"
            description="While browsing the directory, hit “Save” on anyone worth a second look. They'll collect here with their rates, stack and contact details ready to go."
            action={
              <Button to="/developers" icon={Users}>
                Browse developers
              </Button>
            }
            secondary={
              <Link to="/hiring" className="text-sm font-semibold text-brand-300 hover:underline">
                or post a role instead
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
}
