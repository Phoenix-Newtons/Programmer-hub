const SUPABASE_URL = "https://ggfukwknodeqwnitkjvk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnZnVrd2tub2RlcXduaXRranZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNTQwMjMsImV4cCI6MjA5ODgzMDAyM30.oqX9-CyBRox5hgFPjkzzPuCrJvsoFqbbwBgwMuFK7Vw";
const SUPABASE_CLIENT = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "PH";
  return parts.map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

function safeText(value, fallback = "—") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function normalizeSkills(profile) {
  const rawSkills = profile.skills;
  if (Array.isArray(rawSkills)) return rawSkills.filter(Boolean);
  if (typeof rawSkills === "string") {
    return rawSkills.split(",").map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function waLink(number) {
  return `https://wa.me/${String(number).replace(/[^\d]/g, "")}`;
}

function stars(rating) {
  const clean = Number(rating) || 0;
  const full = Math.round(Math.min(Math.max(clean, 0), 5));
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
}

function renderContacts(profile) {
  const items = [];
  if (profile.whatsapp) {
    items.push(`<a class="btn btn-success" href="${waLink(profile.whatsapp)}" target="_blank" rel="noreferrer">💬 WhatsApp</a>`);
  }
  if (profile.email) {
    items.push(`<a class="btn btn-ghost" href="mailto:${profile.email}">✉ Email</a>`);
  }
  return items.join("");
}

window.PH = {
  SUPABASE_CLIENT,
  initials,
  safeText,
  normalizeSkills,
  stars,
  renderContacts,
  waLink
};
