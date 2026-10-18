import { createClient } from "@supabase/supabase-js";

/**
 * Default credentials for the Programmer's Hub Supabase project.
 * Override them with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in `.env.local`
 * or at runtime via `setSupabaseCredentials()`.
 */
export const DEFAULT_PROJECT_REF = "ggfukwknodeqwnitkjvk";
export const DEFAULT_SUPABASE_URL = `https://${DEFAULT_PROJECT_REF}.supabase.co`;
export const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnZnVrd2tub2RlcXduaXRranZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNTQwMjMsImV4cCI6MjA5ODgzMDAyM30.oqX9-CyBRox5hgFPjkzzPuCrJvsoFqbbwBgwMuFK7Vw";

const URL_OVERRIDE_KEY = "ph:supabase-url";
const ANON_OVERRIDE_KEY = "ph:supabase-anon-key";

/** Removes surrounding whitespace and accidental wrapping quotes from env values. */
export function stripWrappingQuotes(value = "") {
  const trimmed = String(value ?? "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith("`") && trimmed.endsWith("`"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/** Extracts the `<ref>` subdomain from `https://<ref>.supabase.co`. */
export function projectRefFromUrl(url = "") {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host.endsWith(".supabase.co") || host.endsWith(".supabase.in")) {
      return host.split(".")[0] || "";
    }
    return "";
  } catch {
    return "";
  }
}

/**
 * Normalizes a Supabase project URL (or bare project ref / dashboard URL) into
 * a clean `https://<ref>.supabase.co` origin, or returns `""` for placeholders.
 */
export function normalizeSupabaseUrl(raw = "") {
  const cleaned = stripWrappingQuotes(raw);
  if (!cleaned) return "";

  const lower = cleaned.toLowerCase();
  if (
    lower === "undefined" ||
    lower === "null" ||
    lower === "false" ||
    lower.includes("xxxx") ||
    lower.includes("your-project") ||
    lower.includes("your_project") ||
    lower.includes("your-supabase") ||
    lower.includes("<") ||
    lower.includes(">")
  ) {
    return "";
  }

  // Handle Supabase dashboard URLs: https://supabase.com/dashboard/project/<ref>
  const dashboardMatch = lower.match(/supabase\.com\/dashboard\/project\/([a-z0-9]{15,30})/i);
  if (dashboardMatch) {
    return `https://${dashboardMatch[1].toLowerCase()}.supabase.co`;
  }

  // Handle a bare 20-char Supabase project reference: ggfukwknodeqwnitkjvk
  if (/^[a-z0-9]{15,30}$/.test(cleaned)) {
    return `https://${lower}.supabase.co`;
  }

  const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  try {
    const parsed = new URL(withProtocol);
    if (!parsed.hostname || !parsed.hostname.includes(".")) return "";
    if (parsed.hostname.endsWith(".supabase.co")) {
      parsed.protocol = "https:";
    }
    return parsed.origin;
  } catch {
    return "";
  }
}

/** Decodes the JSON payload of a 3-part JWT without external dependencies. */
export function parseJwtPayload(token = "") {
  const cleaned = stripWrappingQuotes(token);
  const parts = cleaned.split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json =
      typeof atob === "function"
        ? atob(padded)
        : typeof Buffer !== "undefined"
          ? Buffer.from(padded, "base64").toString("utf8")
          : "";
    if (!json) return null;
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Checks whether `raw` is a real Supabase anon/publishable key (not a
 * `.env.example` placeholder or a key from a different Supabase project).
 */
export function isValidSupabaseKey(raw = "", expectedRef = "") {
  const cleaned = stripWrappingQuotes(raw);
  if (!cleaned) return false;

  const lower = cleaned.toLowerCase();
  if (
    lower === "undefined" ||
    lower === "null" ||
    lower.includes("your-anon-key") ||
    lower.includes("your_anon_key") ||
    lower.includes("your-key") ||
    lower.includes("xxxx") ||
    lower.includes("<") ||
    lower.includes(">")
  ) {
    return false;
  }

  // New Supabase publishable key format: sb_publishable_...
  if (/^sb_publishable_[A-Za-z0-9_-]{12,}$/.test(cleaned)) {
    return true;
  }

  // Standard Supabase JWT anon key: eyJ...
  const payload = parseJwtPayload(cleaned);
  if (!payload) return false;
  if (payload.role === "service_role") return false;
  if (payload.role !== "anon" && payload.iss !== "supabase") return false;
  if (expectedRef && payload.ref && String(payload.ref).toLowerCase() !== expectedRef.toLowerCase()) {
    return false;
  }
  return true;
}

function readStoredOverride(key) {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

/**
 * Resolves the active `{ url, anonKey, projectRef, source }` tuple.
 * Rejects placeholders (`your-anon-key`, `https://xxxx.supabase.co`) and
 * mismatched project keys, falling back to `ggfukwknodeqwnitkjvk.supabase.co`.
 */
export function resolveSupabaseCredentials({
  envUrl = import.meta.env.VITE_SUPABASE_URL,
  envKey = import.meta.env.VITE_SUPABASE_ANON_KEY,
  storedUrl = readStoredOverride(URL_OVERRIDE_KEY),
  storedKey = readStoredOverride(ANON_OVERRIDE_KEY),
} = {}) {
  // 1. Runtime override in localStorage (if valid)
  const normalizedStoredUrl = normalizeSupabaseUrl(storedUrl);
  const storedRef = projectRefFromUrl(normalizedStoredUrl);
  const cleanedStoredKey = stripWrappingQuotes(storedKey);
  if (normalizedStoredUrl && isValidSupabaseKey(cleanedStoredKey, storedRef)) {
    return {
      url: normalizedStoredUrl,
      anonKey: cleanedStoredKey,
      projectRef: storedRef || DEFAULT_PROJECT_REF,
      source: "local",
    };
  }
  if (!normalizedStoredUrl && isValidSupabaseKey(cleanedStoredKey, DEFAULT_PROJECT_REF)) {
    return {
      url: DEFAULT_SUPABASE_URL,
      anonKey: cleanedStoredKey,
      projectRef: DEFAULT_PROJECT_REF,
      source: "local",
    };
  }

  // 2. Environment variables (.env / .env.local / deployment platform)
  const normalizedEnvUrl = normalizeSupabaseUrl(envUrl);
  const envRef = projectRefFromUrl(normalizedEnvUrl);
  const cleanedEnvKey = stripWrappingQuotes(envKey);

  if (normalizedEnvUrl) {
    if (isValidSupabaseKey(cleanedEnvKey, envRef)) {
      return {
        url: normalizedEnvUrl,
        anonKey: cleanedEnvKey,
        projectRef: envRef || DEFAULT_PROJECT_REF,
        source: "env",
      };
    }
    // URL points at the default project, but VITE_SUPABASE_ANON_KEY was left as
    // `your-anon-key` or blank — pair it with the built-in anon key.
    if (envRef === DEFAULT_PROJECT_REF) {
      return {
        url: DEFAULT_SUPABASE_URL,
        anonKey: DEFAULT_SUPABASE_ANON_KEY,
        projectRef: DEFAULT_PROJECT_REF,
        source: "default",
      };
    }
  } else if (isValidSupabaseKey(cleanedEnvKey, DEFAULT_PROJECT_REF)) {
    return {
      url: DEFAULT_SUPABASE_URL,
      anonKey: cleanedEnvKey,
      projectRef: DEFAULT_PROJECT_REF,
      source: "env",
    };
  }

  // 3. Built-in project credentials for https://ggfukwknodeqwnitkjvk.supabase.co
  return {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY,
    projectRef: DEFAULT_PROJECT_REF,
    source: "default",
  };
}

const resolved = resolveSupabaseCredentials();

export const SUPABASE_URL = resolved.url;
export const SUPABASE_ANON_KEY = resolved.anonKey;
export const SUPABASE_PROJECT_REF = resolved.projectRef;
export const SUPABASE_CREDENTIAL_SOURCE = resolved.source;

/**
 * The `localStorage` prefix `auth-js` uses for this project (`sb-<ref>-auth-token`).
 */
export function authStorageKey(url = SUPABASE_URL) {
  const ref = projectRefFromUrl(url);
  return ref ? `sb-${ref}-auth-token` : undefined;
}

const STORAGE_KEY = authStorageKey(SUPABASE_URL);

/**
 * Clears persisted Supabase auth tokens for this project from `localStorage`.
 * Used when a refresh token is revoked/corrupted or when `signOut()` fails offline.
 */
export function clearLocalAuthStorage() {
  if (typeof window === "undefined" || !STORAGE_KEY) return false;
  try {
    const keys = Object.keys(window.localStorage).filter((key) => key.startsWith(STORAGE_KEY));
    keys.forEach((key) => window.localStorage.removeItem(key));
    return true;
  } catch {
    return false;
  }
}

export function hasCustomSupabaseCredentials() {
  return Boolean(readStoredOverride(URL_OVERRIDE_KEY) || readStoredOverride(ANON_OVERRIDE_KEY));
}

export function setSupabaseCredentials({ url = DEFAULT_SUPABASE_URL, anonKey = "" } = {}) {
  const normalizedUrl = normalizeSupabaseUrl(url) || DEFAULT_SUPABASE_URL;
  const ref = projectRefFromUrl(normalizedUrl);
  const cleanedKey = stripWrappingQuotes(anonKey);
  if (!isValidSupabaseKey(cleanedKey, ref)) {
    return {
      ok: false,
      error: new Error(
        ref
          ? `That anon key isn't a valid Supabase anon/publishable key for project "${ref}".`
          : "Enter a valid Supabase anon or publishable key."
      ),
    };
  }
  try {
    window.localStorage.setItem(URL_OVERRIDE_KEY, normalizedUrl);
    window.localStorage.setItem(ANON_OVERRIDE_KEY, cleanedKey);
    return { ok: true, url: normalizedUrl, anonKey: cleanedKey };
  } catch (error) {
    return { ok: false, error };
  }
}

export function resetSupabaseCredentials() {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(URL_OVERRIDE_KEY);
    window.localStorage.removeItem(ANON_OVERRIDE_KEY);
    return true;
  } catch {
    return false;
  }
}

function makeSyntheticRestResponse(init = {}) {
  const headers = new Headers(init?.headers || {});
  const accept = (headers.get("accept") || "").toLowerCase();
  const body = accept.includes("application/vnd.pgrst.object+json") ? "null" : "[]";
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Wraps `fetch` for the Supabase client so that if the remote project rejects
 * the API key (`Invalid API key`) or is unreachable, we circuit-break cleanly
 * and let the local data/auth store handle requests without 401 errors.
 */
function createResilientFetch() {
  let keyRejected = false;

  return async (input, init = {}) => {
    const urlStr = typeof input === "string" ? input : input?.url || "";
    const isRest = urlStr.includes("/rest/v1/");

    if (keyRejected && isRest) {
      return makeSyntheticRestResponse(init);
    }

    if (typeof fetch !== "function") {
      return makeSyntheticRestResponse(init);
    }

    try {
      const response = await fetch(input, init);
      if (response.status === 401 || response.status === 403) {
        const clone = response.clone();
        const text = await clone.text().catch(() => "");
        if (/invalid api key|unregistered api key|no api key|invalid jwt/i.test(text)) {
          keyRejected = true;
          clearLocalAuthStorage();
          if (isRest) {
            return makeSyntheticRestResponse(init);
          }
        }
      }
      return response;
    } catch (error) {
      if (isRest) {
        return makeSyntheticRestResponse(init);
      }
      throw error;
    }
  };
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: STORAGE_KEY,
  },
  global: {
    fetch: createResilientFetch(),
  },
});

export const SUPABASE_CONFIGURED = Boolean(
  SUPABASE_URL && isValidSupabaseKey(SUPABASE_ANON_KEY, SUPABASE_PROJECT_REF)
);
