import { SITE } from "../lib/site";

/**
 * The hub ships with its own build as the first featured project, so the
 * Projects page is never empty before community submissions arrive.
 * Replace or extend this list with your own featured work.
 */
export const SHOWCASE_PROJECTS = [
  {
    id: "showcase-hub",
    showcase: true,
    featured: true,
    title: "Programmer's Hub",
    author_name: SITE.createdBy,
    description:
      "The platform you're looking at: a Supabase-backed developer marketplace with Google sign-in, a hiring board and a project portfolio system.",
    tags: ["React", "Vite", "Tailwind CSS", "Supabase", "Open Source"],
    repo_url: SITE.repo,
    live_url: "",
    cover_url: "",
  },
  {
    id: "showcase-schema",
    showcase: true,
    featured: true,
    title: "Developer profile schema for Supabase",
    author_name: SITE.createdBy,
    description:
      "A drop-in Postgres schema with row-level security for profiles, projects, jobs and avatar storage — designed so public reads work and writes stay owned by their author.",
    tags: ["PostgreSQL", "Supabase", "Tooling", "Open Source"],
    repo_url: `${SITE.repo}/blob/main/supabase/schema.sql`,
    live_url: "",
    cover_url: "",
  },
  {
    id: "showcase-ui-kit",
    showcase: true,
    featured: true,
    title: "Lucide-powered UI kit",
    author_name: SITE.createdBy,
    description:
      "Buttons, cards, modals, filters and empty states built with lucide-react icons and Tailwind v4 tokens — dark mode included, copy-paste friendly.",
    tags: ["React", "Tailwind CSS", "lucide-react", "Tooling"],
    repo_url: `${SITE.repo}/tree/main/src/components/ui`,
    live_url: "",
    cover_url: "",
  },
];
