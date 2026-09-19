export function cn(...classes) {
  return classes.flat(Infinity).filter(Boolean).join(" ");
}

export function initials(name = "", fallback = "PH") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

/** Deterministic gradient per name so every avatar feels branded but stable. */
export function avatarGradient(seed = "") {
  const palettes = [
    "from-indigo-500 to-fuchsia-500",
    "from-sky-500 to-indigo-500",
    "from-emerald-500 to-cyan-500",
    "from-amber-500 to-rose-500",
    "from-violet-500 to-purple-600",
    "from-teal-400 to-blue-600",
  ];
  let hash = 0;
  const str = String(seed || "ph");
  for (let i = 0; i < str.length; i += 1) hash = (hash * 31 + str.charCodeAt(i)) % 9973;
  return palettes[hash % palettes.length];
}

export function safeText(value, fallback = "—") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

export function pluralize(count, singular, plural) {
  const value = Number(count) || 0;
  return `${value} ${value === 1 ? singular : plural || `${singular}s`}`;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

/** Skills arrive either as a Postgres array or a comma-separated string. */
export function normalizeList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch {
      /* not JSON — fall through to comma split */
    }
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function toTagsInput(value) {
  return normalizeList(value).join(", ");
}

export function waLink(number) {
  const digits = String(number || "").replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

export function stars(rating) {
  const clean = Number(rating) || 0;
  const full = Math.round(clamp(clean, 0, 5));
  return { full, empty: Math.max(0, 5 - full), value: clean };
}

/** "1200", "$1,200", "800 – 1200" → a number used for sorting. Best effort. */
export function parseRate(value) {
  if (value === null || value === undefined || value === "") return Number.POSITIVE_INFINITY;
  const numbers = String(value).match(/\d[\d,.]*/g);
  if (!numbers?.length) return Number.POSITIVE_INFINITY;
  const first = Number(numbers[0].replace(/[,\s]/g, ""));
  return Number.isFinite(first) ? first : Number.POSITIVE_INFINITY;
}

export function formatMoney(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `$${num.toLocaleString("en-US")}`;
}

export function timeAgo(date) {
  if (!date) return "";
  const then = new Date(date).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.round((Date.now() - then) / 1000);
  const future = seconds < 0;
  const magnitude = Math.abs(seconds);

  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [unit, size] of units) {
    if (magnitude >= size) {
      const value = Math.floor(magnitude / size);
      const label = `${value} ${unit}${value > 1 ? "s" : ""}`;
      return future ? `in ${label}` : `${label} ago`;
    }
  }
  return future ? "in a moment" : "just now";
}

export function formatDate(date) {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function isValidUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return Boolean(url.hostname.includes("."));
  } catch {
    return false;
  }
}

export function normalizeUrl(value) {
  if (!value) return "";
  return value.startsWith("http") ? value : `https://${value}`;
}

export function hostFromUrl(value) {
  try {
    return new URL(normalizeUrl(value)).hostname.replace(/^www\./, "");
  } catch {
    return value || "";
  }
}

export function truncate(text = "", max = 140) {
  const str = String(text);
  return str.length > max ? `${str.slice(0, max).trimEnd()}…` : str;
}

/** Escapes a value for CSV export (RFC 4180). */
export function csvCell(value) {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCsv(rows, columns) {
  const head = columns.map((column) => csvCell(column.label ?? column.key)).join(",");
  const body = rows
    .map((row) => columns.map((column) => csvCell(column.value ? column.value(row) : row[column.key])).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

/** Triggers a client-side file download without any dependency. */
export function downloadFile(filename, content, type = "text/plain;charset=utf-8") {
  if (typeof document === "undefined") return false;
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** Clipboard with a graceful fallback for older/insecure contexts. */
export async function copyToClipboard(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export function debounce(fn, wait = 250) {
  let timer;
  function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  }
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

/** Turns a Supabase/Postgrest error into something a human can act on. */
export function friendlyError(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;
  const message = error.message || fallback;
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "Can't reach Supabase right now. Check your connection and project URL.";
  }
  if (/relation .* does not exist|Could not find the table/i.test(message)) {
    return "Database table missing. Run supabase/schema.sql in your Supabase SQL editor.";
  }
  if (/row-level security|violates row-level security/i.test(message)) {
    return "Permission denied by Row Level Security. Check the policies in supabase/schema.sql.";
  }
  if (/invalid login credentials/i.test(message)) {
    return "Wrong email or password. Try again or reset your password.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Confirm your email address first — check your inbox for the confirmation link.";
  }
  if (/user already registered/i.test(message)) {
    return "That email is already registered. Try signing in instead.";
  }
  if (/password should be/i.test(message)) {
    return "Password must be at least 6 characters.";
  }
  if (/rate limit|too many requests/i.test(message)) {
    return "Too many requests — wait a few seconds and try again.";
  }
  return message;
}

/** Is this a connectivity problem rather than a schema problem? */
export function isNetworkError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed") ||
    message.includes("network request failed") ||
    error?.name === "TypeError"
  );
}

/** Does the error mean "the table isn't set up yet"? */
export function isMissingTableError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    (error?.code || "").startsWith("42P") ||
    error?.code === "PGRST205" ||
    error?.code === "PGRST204"
  );
}

/** Sorts a list without mutating the input. */
export function sortBy(list, selector, direction = "asc") {
  const factor = direction === "desc" ? -1 : 1;
  return [...list].sort((a, b) => {
    const left = selector(a);
    const right = selector(b);
    if (left === right) return 0;
    if (left === null || left === undefined) return 1;
    if (right === null || right === undefined) return -1;
    return left > right ? factor : -factor;
  });
}

/** Case-insensitive containment check that also accepts array/haystack lists. */
export function matchesQuery(query, ...values) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) =>
    (Array.isArray(value) ? value : [value])
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(needle)
  );
}

/** Signature shared by the profile "strength" meter so it stays consistent. */
export function completionOf(values, keys) {
  const filled = keys.filter((key) => String(values?.[key] ?? "").trim().length > 0).length;
  return Math.round((filled / keys.length) * 100);
}
