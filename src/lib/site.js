/**
 * Single source of truth for brand + contact details.
 * Edit this file to re-skin the whole app.
 */
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
