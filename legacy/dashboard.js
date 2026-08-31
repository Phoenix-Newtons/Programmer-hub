import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient("https://ggfukwknodeqwnitkjvk.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnZnVrd2tub2RlcXduaXRranZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNTQwMjMsImV4cCI6MjA5ODgzMDAyM30.oqX9-CyBRox5hgFPjkzzPuCrJvsoFqbbwBgwMuFK7Vw");

const $ = (s) => document.querySelector(s);
const form = $("#profileForm");
const msg = $("#formMsg");
const logoutBtn = $("#dashLogoutBtn");
const logoutBtnMobile = $("#dashLogoutBtnMobile");
const menuBtn = $("#menuBtnDash");
const mobilePanel = $("#mobilePanelDash");
const loadBtn = $("#loadProfileBtn");
const avatarFile = $("#avatarFile");
const sideAvatar = $("#sideAvatar");
const sideName = $("#sideName");
const sideEmail = $("#sideEmail");
const profileProgress = $("#profileProgress");
const completionText = $("#completionText");
const dashUserEmail = $("#dashUserEmail");
const dashUserPill = $("#dashUserPill");
const dashNotice = $("#dashNotice");
const publicStatus = $("#publicStatus");
const verifiedStatus = $("#verifiedStatus");

const fields = ["name","title","location","hourly_rate","email","whatsapp","github","linkedin","skills","bio","experience","avatar_url"];

function setMsg(text, type = "info") {
  msg.textContent = text;
  msg.style.color = type === "error" ? "#fecaca" : type === "success" ? "#bbf7d0" : "#cbd5e1";
}

function skillsToText(v) {
  if (Array.isArray(v)) return v.join(", ");
  return v || "";
}

function textToSkills(v) {
  return String(v || "").split(",").map(s => s.trim()).filter(Boolean);
}

function completionPercent(data) {
  const checks = [
    data?.name,
    data?.title,
    data?.location,
    data?.bio,
    data?.email,
    data?.whatsapp,
    data?.github,
    data?.linkedin,
    data?.skills?.length,
    data?.experience,
    data?.hourly_rate,
    data?.avatar_url,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

function applyProfileToForm(profile) {
  $("#name").value = profile?.name || "";
  $("#title").value = profile?.title || "";
  $("#location").value = profile?.location || "";
  $("#hourly_rate").value = profile?.hourly_rate || "";
  $("#email").value = profile?.email || "";
  $("#whatsapp").value = profile?.whatsapp || "";
  $("#github").value = profile?.github || "";
  $("#linkedin").value = profile?.linkedin || "";
  $("#skills").value = skillsToText(profile?.skills);
  $("#bio").value = profile?.bio || "";
  $("#experience").value = profile?.experience || "";
  $("#avatar_url").value = profile?.avatar_url || "";
  sideName.textContent = profile?.name || "Profile Dashboard";
  sideAvatar.textContent = (profile?.name || "PH").split(" ").map(p => p[0]).join("").slice(0,2).toUpperCase();
  publicStatus.textContent = profile ? "On" : "Off";
  verifiedStatus.textContent = profile?.verified ? "Verified" : "Waiting";
  const percent = completionPercent(profile);
  profileProgress.style.width = `${percent}%`;
  completionText.textContent = `${percent}% complete`;
}

async function requireAuth() {
  const { data } = await supabase.auth.getSession();
  const session = data?.session;
  if (!session) {
    location.href = "index.html";
    return null;
  }
  dashUserEmail.textContent = session.user.email;
  sideEmail.textContent = session.user.email;
  dashUserPill.style.display = "inline-flex";
  return session.user;
}

async function loadMyProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    setMsg(error.message, "error");
    return null;
  }
  if (data) {
    applyProfileToForm(data);
    dashNotice.textContent = "Profile loaded from Supabase.";
    return data;
  }

  const empty = {
    user_id: userId,
    name: "",
    title: "",
    location: "",
    hourly_rate: "",
    email: "",
    whatsapp: "",
    github: "",
    linkedin: "",
    skills: [],
    bio: "",
    experience: "",
    avatar_url: "",
    verified: false,
    featured: false,
  };
  applyProfileToForm(empty);
  dashNotice.textContent = "Create your profile and save it to Supabase.";
  return empty;
}

async function uploadAvatar(userId, file) {
  if (!file) return null;
  const ext = file.name.split(".").pop();
  const path = `avatars/${userId}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

async function saveProfile(userId) {
  const payload = {
    user_id: userId,
    name: $("#name").value.trim(),
    title: $("#title").value.trim(),
    location: $("#location").value.trim(),
    hourly_rate: $("#hourly_rate").value.trim(),
    email: $("#email").value.trim(),
    whatsapp: $("#whatsapp").value.trim(),
    github: $("#github").value.trim(),
    linkedin: $("#linkedin").value.trim(),
    skills: textToSkills($("#skills").value),
    bio: $("#bio").value.trim(),
    experience: $("#experience").value.trim(),
    avatar_url: $("#avatar_url").value.trim(),
    updated_at: new Date().toISOString(),
  };

  if (!payload.name) throw new Error("Name is required.");

  const { data: existing } = await supabase.from("profiles").select("id").eq("user_id", userId).maybeSingle();
  let result;
  if (existing?.id) {
    result = await supabase.from("profiles").update(payload).eq("user_id", userId).select("*").single();
  } else {
    result = await supabase.from("profiles").insert(payload).select("*").single();
  }
  if (result.error) throw result.error;
  return result.data;
}

logoutBtn?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.href = "index.html";
});
logoutBtnMobile?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.href = "index.html";
});

menuBtn?.addEventListener("click", () => mobilePanel.classList.toggle("open"));

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    setMsg("Saving...");
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    if (!user) throw new Error("Not signed in.");

    if (avatarFile.files?.[0]) {
      const url = await uploadAvatar(user.id, avatarFile.files[0]);
      $("#avatar_url").value = url || $("#avatar_url").value;
    }

    const saved = await saveProfile(user.id);
    applyProfileToForm(saved);
    setMsg("Profile saved successfully.", "success");
  } catch (err) {
    setMsg(err.message || "Unable to save profile.", "error");
  }
});

loadBtn?.addEventListener("click", async () => {
  try {
    setMsg("Reloading...");
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    if (!user) throw new Error("Not signed in.");
    await loadMyProfile(user.id);
    setMsg("Profile reloaded.", "success");
  } catch (err) {
    setMsg(err.message || "Unable to reload profile.", "error");
  }
});

supabase.auth.onAuthStateChange(async () => {
  const user = await requireAuth();
  if (user) await loadMyProfile(user.id);
});

const user = await requireAuth();
if (user) await loadMyProfile(user.id);
