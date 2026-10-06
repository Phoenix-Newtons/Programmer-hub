/**
 * Single source of truth for brand + contact details.
 * Edit this file to re-skin the whole app.
 */

/**
 * Absolute origin used for canonical URLs, og:url and the sitemap.
 * Set `VITE_SITE_URL` when deploying; falls back to the current origin at runtime.
 */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || "").replace(/\/$/, "");

/** Absolute URL for a route path, e.g. absoluteUrl("/developers"). */
export function absoluteUrl(path = "/") {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (SITE_URL) return `${SITE_URL}${clean}`;
  if (typeof window === "undefined") return clean;
  return `${window.location.origin}${clean}`;
}
export const SITE = {
  name: "Programmer's Hub",
  shortName: "PH",
  tagline: "Find talent. Ship projects. Get hired.",
  description:
    "Programmer's Hub is a modern developer marketplace — showcase your stack, publish real projects and get contacted in one click.",
  createdBy: "Luwangula Alpha",
  creator: {
    name: "Luwangula Alpha",
    role: "Founder & Lead Engineer",
    location: "Kampala, Uganda",
    bio: "Self-taught full-stack developer building tools that make it easier for African developers to be seen, trusted and hired.",
    initials: "LA",
  },
  supportEmail: "alphaluwangula@proton.me",
  whatsapp: "256700000000",
  github: "https://github.com/Phoenix-Newtons",
  repo: "https://github.com/Phoenix-Newtons/Programmer-hub",
  foundedYear: 2025,
  twitter: "https://x.com/",
  locale: "en_GB",
};

export const NAV_LINKS = [
  { to: "/developers", label: "Developers" },
  { to: "/projects", label: "Projects" },
  { to: "/hiring", label: "Hiring" },
  { to: "/about", label: "About" },
];

export const TECH_MARQUEE = [
  "React",
  "Next.js",
  "TypeScript",
  "Node.js",
  "Python",
  "Go",
  "Rust",
  "Supabase",
  "PostgreSQL",
  "Tailwind CSS",
  "Flutter",
  "Swift",
  "Kotlin",
  "Docker",
  "GraphQL",
  "Firebase",
  "Solidity",
  "TensorFlow",
];

/** The stack this app itself is built with (shown in the footer). */
export const TECHNOLOGIES = ["React 19", "Vite", "Tailwind CSS v4", "Supabase", "lucide-react"];

export const SKILL_FILTERS = [
  "All",
  "React",
  "Node.js",
  "TypeScript",
  "Python",
  "Supabase",
  "Flutter",
  "UI/UX",
  "DevOps",
];

export const PROJECT_FILTERS = ["All", "Web", "Mobile", "AI", "Tooling", "Open Source"];

export const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"];

export const EXPERIENCE_LEVELS = ["Junior", "Mid-level", "Senior", "Lead", "Any"];

export const JOB_STATUSES = [
  { id: "open", label: "Open" },
  { id: "closed", label: "Closed" },
];

/** Sorting options shared by the directory pages. */
export const DEVELOPER_SORTS = [
  { id: "relevance", label: "Best match" },
  { id: "rating", label: "Top rated" },
  { id: "rate-low", label: "Lowest rate" },
  { id: "newest", label: "Newest" },
  { id: "name", label: "Name A–Z" },
];

export const JOB_SORTS = [
  { id: "recent", label: "Newest first" },
  { id: "budget", label: "Highest budget" },
  { id: "title", label: "Role A–Z" },
];

export const PROJECT_SORTS = [
  { id: "recent", label: "Newest first" },
  { id: "title", label: "Title A–Z" },
  { id: "featured", label: "Featured first" },
];

/** Page size for the "load more" pattern on long lists. */
export const PAGE_SIZE = 9;

/** Platform promises shown on the About page and in empty states. */
export const PLATFORM_PROMISES = [
  {
    title: "Free, forever",
    text: "No listing fees, no commission on hires and no paywalled profiles. The hub is a discovery layer.",
  },
  {
    title: "Direct contact",
    text: "Every profile exposes the channels its owner chose — WhatsApp, email or a portfolio link.",
  },
  {
    title: "Own your data",
    text: "Profiles, projects and roles live in your own Supabase project. Export or delete them any time.",
  },
];
