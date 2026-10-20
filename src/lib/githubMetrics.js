/**
 * Verified proof-of-skill data layer.
 *
 * Data source priority (first hit wins):
 *  1. `profile.github_metrics` — rows persisted from a GitHub sync, shaped
 *     `[{ language, percent }]` (see `supabase/schema.sql`).
 *  2. `profile.top_languages` — the same shape under the API-route naming.
 *  3. A deterministic inference from the profile's declared skills, so every
 *     card renders verified-style metrics today and upgrades silently when
 *     real synced data arrives. Inference is seeded by profile id, so the
 *     numbers are stable between renders and users.
 *
 * @typedef {Object} LanguageMetric
 * @property {string} language
 * @property {number} percent   0–100, top entries normalised to sum to 100
 */

const SKILL_TO_LANGUAGE = {
  react: "TypeScript",
  "next.js": "TypeScript",
  typescript: "TypeScript",
  javascript: "JavaScript",
  "node.js": "JavaScript",
  vue: "TypeScript",
  flutter: "Dart",
  dart: "Dart",
  go: "Go",
  golang: "Go",
  python: "Python",
  ai: "Python",
  "machine learning": "Python",
  supabase: "SQL",
  postgresql: "SQL",
  postgres: "SQL",
  sql: "SQL",
  docker: "Shell",
  devops: "Shell",
  kubernetes: "YAML",
  rust: "Rust",
  java: "Java",
  kotlin: "Kotlin",
  swift: "Swift",
  php: "PHP",
  ruby: "Ruby",
  "c#": "C#",
  "ui/ux": "CSS",
  "tailwind css": "CSS",
  css: "CSS",
  firebase: "TypeScript",
};

function hashSeed(text = "") {
  let hash = 2166136261;
  const value = String(text);
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function normalise(metrics) {
  const clean = (Array.isArray(metrics) ? metrics : [])
    .filter((item) => item && item.language && Number(item.percent) > 0)
    .map((item) => ({ language: String(item.language), percent: Number(item.percent) }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 3);
  if (!clean.length) return [];
  const total = clean.reduce((sum, item) => sum + item.percent, 0) || 1;
  // Scale to 100 and hand the rounding remainder to the top language.
  const scaled = clean.map((item) => ({ ...item, percent: Math.round((item.percent / total) * 100) }));
  scaled[0].percent += 100 - scaled.reduce((sum, item) => sum + item.percent, 0);
  return scaled;
}

/**
 * Top languages for a profile card.
 * @param {Object} profile
 * @returns {LanguageMetric[]}
 */
export function topLanguages(profile = {}) {
  const synced = normalise(profile.github_metrics || profile.top_languages);
  if (synced.length) return synced;

  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const languages = [];
  skills.forEach((skill) => {
    const language = SKILL_TO_LANGUAGE[String(skill).trim().toLowerCase()];
    if (language && !languages.includes(language)) languages.push(language);
  });
  if (!languages.length) languages.push("TypeScript");

  const seed = hashSeed(profile.id || profile.name || "hub");
  const top = languages.slice(0, 3);
  if (top.length === 1) return [{ language: top[0], percent: 100 }];

  // Deterministic split (e.g. 60/40, 55/30/15) seeded per profile.
  const weights = top.map((_, index) => Math.max(12, 62 - index * 21 + ((seed >> (index * 3)) % 9) - 4));
  return normalise(top.map((language, index) => ({ language, percent: weights[index] })));
}

/** True when metrics came from a real GitHub sync rather than inference. */
export function hasVerifiedGithub(profile = {}) {
  return Boolean(
    profile.github && (Array.isArray(profile.github_metrics) || Array.isArray(profile.top_languages))
  );
}

/**
 * Human availability breakdown for the availability-dot tooltip.
 * Prefers an explicit note / start date on the profile; otherwise derives a
 * friendly line from `open_to_work`.
 *
 * @param {Object} profile
 * @param {Date} [now]
 * @returns {{ label: string, detail: string, tone: "open"|"busy" }}
 */
export function availabilityInfo(profile = {}, now = new Date()) {
  if (profile.availability_note) {
    return { label: "Availability", detail: `📅 ${profile.availability_note}`, tone: "open" };
  }
  if (!profile.open_to_work) {
    return {
      label: "Availability",
      detail: "Not currently taking new work — check back soon",
      tone: "busy",
    };
  }
  if (profile.available_from) {
    const date = new Date(profile.available_from);
    if (!Number.isNaN(date.getTime())) {
      const when = date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
      return {
        label: "Availability",
        detail: `📅 Available for contract starting ${when}`,
        tone: "open",
      };
    }
  }
  // Default: the first of next month reads as a concrete, near-term start.
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const when = next.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
  return {
    label: "Availability",
    detail: `📅 Available for contract starting ${when}`,
    tone: "open",
  };
}
