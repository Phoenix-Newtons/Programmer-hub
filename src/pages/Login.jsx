import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Check,
  Eye,
  EyeOff,
  FolderGit2,
  KeyRound,
  MailCheck,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

import Field from "../components/ui/Field";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import usePageMeta from "../hooks/usePageMeta";
import { SITE } from "../lib/site";
import { friendlyError } from "../lib/utils";

const PERKS = [
  {
    icon: Users,
    title: "A public developer profile",
    text: "Stack, rate, location, links and open-to-work status.",
  },
  {
    icon: FolderGit2,
    title: "A portfolio of shipped work",
    text: "Publish projects with repo and live URLs.",
  },
  {
    icon: ShieldCheck,
    title: "Two-factor protected",
    text: "An authenticator app adds a second step to every sign-in before anything can be published.",
  },
  {
    icon: BadgeCheck,
    title: "Direct client enquiries",
    text: "One-tap WhatsApp and email contact, no middleman.",
  },
];

/** Password strength helper — purely advisory, Supabase enforces the rules. */
function passwordScore(password = "") {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

const STRENGTH = ["Too short", "Weak", "Okay", "Good", "Strong"];

export default function Login() {
  usePageMeta({
    title: "Sign in",
    description:
      "Sign in or create your Programmer's Hub account with email, password and two-factor authentication.",
    noIndex: true,
  });

  const [params] = useSearchParams();
  const redirectTo = params.get("redirect") || "/dashboard";
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated, signInWithPassword, signUpWithPassword, resendConfirmationEmail, resetPassword } =
    useAuth();

  const [mode, setMode] = useState(() => (params.get("mode") === "signup" ? "signup" : "signin"));
  const [values, setValues] = useState({ fullName: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate(redirectTo, { replace: true });
  }, [isAuthenticated, navigate, redirectTo]);

  function update(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError("");
  }

  function validate() {
    const next = {};
    const cleanEmail = values.email.trim();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) next.email = "Enter a valid email address.";
    if (values.password.length < 6) {
      next.password = "Password must be at least 6 characters.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setServerError("");
    if (!validate()) return;
    setBusy(true);
    const cleanEmail = values.email.trim().toLowerCase();

    if (mode === "signin") {
      const { error } = await signInWithPassword(cleanEmail, values.password);
      setBusy(false);
      if (error) {
        if (/email not confirmed/i.test(String(error.message || ""))) {
          setPendingConfirmEmail(cleanEmail);
        }
        const msg = friendlyError(error, "Could not sign in.");
        setServerError(msg);
        toast.error(msg);
        return;
      }
      toast.success("Welcome back!");
      navigate(redirectTo, { replace: true });
      return;
    }

    const cleanName = values.fullName.trim() || (cleanEmail ? cleanEmail.split("@")[0] : "") || "Developer";
    const { data, error, alreadyRegistered, existingAccountSignedIn, needsEmailConfirmation } =
      await signUpWithPassword(cleanEmail, values.password, {
        full_name: cleanName,
      });
    setBusy(false);

    if (alreadyRegistered) {
      const msg =
        "An account with this email already exists. Enter your password to sign in, or click 'Forgot your password?' below.";
      setMode("signin");
      setServerError(msg);
      toast.info(msg);
      return;
    }

    if (error) {
      const msg = friendlyError(error, "Could not create your account.");
      setServerError(msg);
      toast.error(msg);
      return;
    }

    if (data?.session) {
      toast.success(existingAccountSignedIn ? "Welcome back!" : "Account created. Let's build your profile!");
      navigate(redirectTo, { replace: true });
    } else if (needsEmailConfirmation || data?.user) {
      setPendingConfirmEmail(cleanEmail);
      setMode("signin");
      setResetSent(false);
      toast.success("Account created — check your email to confirm, then sign in.");
    }
  }

  async function handleResendConfirmation() {
    const targetEmail = (pendingConfirmEmail || values.email).trim().toLowerCase();
    if (!targetEmail) return;
    setResending(true);
    const { error } = await resendConfirmationEmail(targetEmail);
    setResending(false);
    if (error) {
      toast.error(friendlyError(error, "Could not resend the confirmation email."));
      return;
    }
    toast.success(`Confirmation link sent to ${targetEmail}.`);
  }

  async function handleReset() {
    const cleanEmail = values.email.trim();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setErrors({ email: "Enter your email first, then press forgot password." });
      return;
    }
    setBusy(true);
    const { error } = await resetPassword(cleanEmail);
    setBusy(false);
    if (error) {
      toast.error(friendlyError(error, "Could not send the reset email."));
      return;
    }
    setResetSent(true);
    toast.success("Password reset link sent. Check your inbox.");
  }

  const score = passwordScore(values.password);

  return (
    <div className="container-page py-12 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-center">
        {/* Form */}
        <div className="card mx-auto w-full max-w-xl p-7 sm:p-9">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-brand-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back home
          </Link>

          <h1 className="mt-6 text-3xl font-black tracking-tight text-ink">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {mode === "signin"
              ? "Sign in to update your profile, publish projects and post roles."
              : "Two minutes to a live developer profile. No credit card, ever."}
          </p>

          <div className="mt-7 flex items-start gap-3 rounded-2xl border border-line-strong bg-surface p-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-muted">
              Email, password and a 6-digit code from your authenticator app. Two-factor authentication is set
              up right after your first sign-in and is required before you can publish.
            </p>
          </div>

          <div
            className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-line bg-surface p-1"
            role="tablist"
          >
            {[
              { id: "signin", label: "Sign in", icon: KeyRound },
              { id: "signup", label: "Sign up", icon: UserPlus },
            ].map((tabItem) => (
              <button
                key={tabItem.id}
                type="button"
                role="tab"
                aria-selected={mode === tabItem.id}
                onClick={() => {
                  setMode(tabItem.id);
                  setErrors({});
                  setServerError("");
                  setResetSent(false);
                }}
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  mode === tabItem.id
                    ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white"
                    : "text-muted hover:text-ink"
                }`}
              >
                <tabItem.icon className="h-4 w-4" aria-hidden="true" />
                {tabItem.label}
              </button>
            ))}
          </div>

          {pendingConfirmEmail ? (
            <div
              role="status"
              className="mb-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-xs leading-relaxed text-emerald-100"
            >
              <div className="flex items-start gap-2.5">
                <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white">Confirm your email to finish creating your account</p>
                  <p className="mt-1 text-emerald-100/85">
                    We sent a confirmation link to{" "}
                    <span className="font-mono font-semibold text-white">{pendingConfirmEmail}</span>. Open
                    the link in your inbox (or spam folder), then sign in below.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      icon={RefreshCw}
                      loading={resending}
                      onClick={handleResendConfirmation}
                    >
                      Resend confirmation email
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {serverError ? (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-xs leading-relaxed text-rose-100"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
              <span>{serverError}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
            {mode === "signup" ? (
              <Field
                label="Full name"
                hint="shown on your public profile"
                value={values.fullName}
                onChange={(event) => update("fullName", event.target.value)}
                error={errors.fullName}
                placeholder="Luwangula Alpha"
                autoComplete="name"
                data-autofocus
              />
            ) : null}

            <Field
              label="Email address"
              type="email"
              required
              value={values.email}
              onChange={(event) => update("email", event.target.value)}
              error={errors.email}
              placeholder="you@example.com"
              autoComplete="email"
            />

            <div className="relative">
              <Field
                label="Password"
                type={showPassword ? "text" : "password"}
                required
                value={values.password}
                onChange={(event) => update("password", event.target.value)}
                error={errors.password}
                placeholder={mode === "signin" ? "Your password" : "At least 6 characters"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="[&_input]:pr-24"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-[2.35rem] flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition hover:text-ink"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {mode === "signup" && values.password ? (
              <div>
                <div className="flex gap-1" aria-hidden="true">
                  {[0, 1, 2, 3].map((index) => (
                    <span
                      key={index}
                      className={`h-1.5 flex-1 rounded-full transition ${
                        index < score
                          ? score <= 1
                            ? "bg-rose-400"
                            : score === 2
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                          : "bg-line"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted" aria-live="polite">
                  Password strength: <span className="font-semibold text-ink-soft">{STRENGTH[score]}</span>
                </p>
              </div>
            ) : null}

            <Button type="submit" loading={busy} icon={Rocket} className="mt-1 w-full">
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          {mode === "signin" ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="text-sm font-semibold text-brand-300 transition hover:underline"
              >
                Forgot your password?
              </button>
              {resetSent ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Reset link sent
                </span>
              ) : null}
            </div>
          ) : null}

          <p className="mt-6 flex items-start gap-2 rounded-xl border border-line-strong bg-surface p-3 text-xs leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" aria-hidden="true" />
            Authentication and TOTP two-factor run on Supabase. Your password never touches this app&rsquo;s
            code.
          </p>
        </div>

        {/* Pitch */}
        <aside className="relative hidden lg:block">
          <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-tr from-indigo-500/20 via-fuchsia-500/10 to-cyan-400/20 blur-3xl" />
          <div className="card p-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-brand-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Why join
            </span>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-ink">
              Everything you need to be found.
            </h2>

            <ul className="mt-7 space-y-5">
              {PERKS.map((perk) => (
                <li key={perk.title} className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-line-strong bg-brand-500/10 text-brand-300">
                    <perk.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">{perk.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{perk.text}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border border-line bg-surface p-4 text-xs leading-relaxed text-muted">
              Need help signing in? Email{" "}
              <a
                href={`mailto:${SITE.supportEmail}`}
                className="font-semibold text-brand-300 hover:underline"
              >
                {SITE.supportEmail}
              </a>{" "}
              or message us on WhatsApp.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
