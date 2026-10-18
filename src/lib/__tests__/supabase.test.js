import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROJECT_REF,
  DEFAULT_SUPABASE_ANON_KEY,
  DEFAULT_SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_CONFIGURED,
  SUPABASE_PROJECT_REF,
  SUPABASE_URL,
  authStorageKey,
  isValidSupabaseKey,
  normalizeSupabaseUrl,
  parseJwtPayload,
  projectRefFromUrl,
  resolveSupabaseCredentials,
  stripWrappingQuotes,
} from "../supabase";

describe("supabase credential helpers", () => {
  it("ships with the default ggfukwknodeqwnitkjvk.supabase.co credentials", () => {
    expect(DEFAULT_SUPABASE_URL).toBe("https://ggfukwknodeqwnitkjvk.supabase.co");
    expect(SUPABASE_URL).toBe("https://ggfukwknodeqwnitkjvk.supabase.co");
    expect(SUPABASE_PROJECT_REF).toBe("ggfukwknodeqwnitkjvk");
    expect(SUPABASE_ANON_KEY).toBe(DEFAULT_SUPABASE_ANON_KEY);
    expect(SUPABASE_CONFIGURED).toBe(true);
  });

  it("strips wrapping quotes and whitespace", () => {
    expect(stripWrappingQuotes(' "https://ggfukwknodeqwnitkjvk.supabase.co" ')).toBe(
      "https://ggfukwknodeqwnitkjvk.supabase.co"
    );
    expect(stripWrappingQuotes("'abc'")).toBe("abc");
  });

  it("normalizes Supabase URLs, bare project refs and dashboard links", () => {
    expect(normalizeSupabaseUrl("https://ggfukwknodeqwnitkjvk.supabase.co/rest/v1")).toBe(
      "https://ggfukwknodeqwnitkjvk.supabase.co"
    );
    expect(normalizeSupabaseUrl("ggfukwknodeqwnitkjvk")).toBe("https://ggfukwknodeqwnitkjvk.supabase.co");
    expect(
      normalizeSupabaseUrl("https://supabase.com/dashboard/project/ggfukwknodeqwnitkjvk/settings/api")
    ).toBe("https://ggfukwknodeqwnitkjvk.supabase.co");
    expect(normalizeSupabaseUrl("http://ggfukwknodeqwnitkjvk.supabase.co")).toBe(
      "https://ggfukwknodeqwnitkjvk.supabase.co"
    );
  });

  it("rejects placeholder URLs", () => {
    expect(normalizeSupabaseUrl("")).toBe("");
    expect(normalizeSupabaseUrl("https://xxxx.supabase.co")).toBe("");
    expect(normalizeSupabaseUrl("https://your-project.supabase.co")).toBe("");
    expect(normalizeSupabaseUrl("<your-supabase-url>")).toBe("");
    expect(normalizeSupabaseUrl("undefined")).toBe("");
  });

  it("decodes JWT payload and validates anon keys against project ref", () => {
    const payload = parseJwtPayload(DEFAULT_SUPABASE_ANON_KEY);
    expect(payload).toMatchObject({
      iss: "supabase",
      ref: DEFAULT_PROJECT_REF,
      role: "anon",
    });

    expect(isValidSupabaseKey(DEFAULT_SUPABASE_ANON_KEY, DEFAULT_PROJECT_REF)).toBe(true);
    expect(isValidSupabaseKey(DEFAULT_SUPABASE_ANON_KEY, "differentprojectref")).toBe(false);
    expect(isValidSupabaseKey("sb_publishable_abc123def456ghi789", DEFAULT_PROJECT_REF)).toBe(true);
    expect(isValidSupabaseKey("your-anon-key", DEFAULT_PROJECT_REF)).toBe(false);
    expect(isValidSupabaseKey("", DEFAULT_PROJECT_REF)).toBe(false);
  });

  it("falls back to the built-in anon key when env has placeholder `your-anon-key`", () => {
    const resolved = resolveSupabaseCredentials({
      envUrl: "https://ggfukwknodeqwnitkjvk.supabase.co",
      envKey: "your-anon-key",
      storedUrl: "",
      storedKey: "",
    });
    expect(resolved.url).toBe(DEFAULT_SUPABASE_URL);
    expect(resolved.anonKey).toBe(DEFAULT_SUPABASE_ANON_KEY);
    expect(resolved.projectRef).toBe(DEFAULT_PROJECT_REF);
  });

  it("falls back to default credentials when both env vars are placeholders", () => {
    const resolved = resolveSupabaseCredentials({
      envUrl: "https://xxxx.supabase.co",
      envKey: "your-anon-key",
      storedUrl: "",
      storedKey: "",
    });
    expect(resolved.url).toBe(DEFAULT_SUPABASE_URL);
    expect(resolved.anonKey).toBe(DEFAULT_SUPABASE_ANON_KEY);
  });

  it("derives the storage key from the project URL", () => {
    expect(projectRefFromUrl(DEFAULT_SUPABASE_URL)).toBe("ggfukwknodeqwnitkjvk");
    expect(authStorageKey(DEFAULT_SUPABASE_URL)).toBe("sb-ggfukwknodeqwnitkjvk-auth-token");
  });
});
