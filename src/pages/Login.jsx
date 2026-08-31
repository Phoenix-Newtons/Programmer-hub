import { useEffect, useState } from "react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  FolderGit2,
  KeyRound,
  Mail,
  Rocket,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import Field from "../components/ui/Field";
import Button from "../components/ui/Button";
import GoogleButton from "../components/auth/GoogleButton";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { SITE } from "../lib/site";
import { friendlyError } from "../lib/utils";

const PERKS = [
  { icon: Users, title: "A public developer profile", text: "Stack, rate, location, links and open-to-work status." },
  { icon: FolderGit2, title: "A portfolio of shipped work", text: "Publish projects with repo and live URLs." },
  { icon: BadgeCheck, title: "Direct client enquiries", text: "One-tap WhatsApp and email contact, no middleman." },
];

export default function Login() {
  useDocumentTitle("Sign in");
  const [params] = useSearchParams();
  const redirectTo = params.get("redirect") || "/dashboard";
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated, signInWithPassword, signUpWithPassword, resetPassword } = useAuth();

  const [mode, setMode] = useState("signin");
  const [values, setValues] = useState({ fullName: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate(redirectTo, { replace: true });
  }, [isAuthenticated, navigate, redirectTo]);

  function update(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validate() {
    const next = {};
    if (!/^\S+@\S+\.\S+$/.test(values.email)) next.email = "Enter a valid email address.";
    if (values.password.length < 6) next.password = "Password must be at least 6 characters.";
    if (mode === "signup" && values.fullName.trim().length < 2) next.fullName = "Tell us your name.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setBusy(true);

    if (mode === "signin") {
      const { error } = await signInWithPassword(values.email.trim(), values.password);
      setBusy(false);
      if (error) return toast.error(friendlyError(error, "Could not sign in."));
      toast.success("Welcome back!");
      navigate(redirectTo, { replace: true });
      return;
    }

    const { data, error } = await signUpWithPassword(values.email.trim(), values.password, {
      full_name: values.fullName.trim(),
    });
    setBusy(false);
    if (error) return toast.error(friendlyError(error, "Could not create your account."));

    if (data?.session) {
      toast.success("Account created. Let's build your profile!");
      navigate(redirectTo, { replace: true });
    } else {
      toast.success("Account created — confirm your email, then sign in.");
      setMode("signin");
    }
  }

  async function handleReset() {
    if (!/^\S+@\S+\.\S+$/.test(values.email)) {
      setErrors({ email: "Enter your email first, then press forgot password." });
      return;
    }
    const { error } = await resetPassword(values.email.trim());
    if (error) return toast.error(friendlyError(error, "Could not send the reset email."));
    toast.success("Password reset link sent. Check your inbox.");
  }

  return (
    <div className="container-page py-12 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-center">
        {/* Form */}
        <div className="card mx-auto w-full max-w-xl p-7 sm:p-9">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-brand-300">
            <ArrowLeft className="h-4 w-4" />
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

          <div className="mt-7">
            <GoogleButton
              label={mode === "signin" ? "Sign in with Google" : "Sign up with Google"}
              redirectTo={`${window.location.origin}${redirectTo}`}
              className="w-full"
            />
          </div>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-muted">or use email</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-line bg-surface p-1">
            {[
              { id: "signin", label: "Sign in", icon: KeyRound },
              { id: "signup", label: "Sign up", icon: UserPlus },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMode(tab.id);
                  setErrors({});
                }}
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  mode === tab.id
                    ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white"
                    : "text-muted hover:text-ink"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
            {mode === "signup" ? (
              <Field
                label="Full name"
                required
                value={values.fullName}
                onChange={(event) => update("fullName", event.target.value)}
                error={errors.fullName}
                placeholder="Luwangula Alpha"
                autoComplete="name"
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

            <Field
              label="Password"
              type="password"
              required
              value={values.password}
              onChange={(event) => update("password", event.target.value)}
              error={errors.password}
              placeholder="At least 6 characters"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />

            <Button type="submit" loading={busy} icon={Rocket} className="mt-1 w-full">
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          {mode === "signin" ? (
            <button
              type="button"
              onClick={handleReset}
              className="mt-4 text-sm font-semibold text-brand-300 transition hover:underline"
            >
              Forgot your password?
            </button>
          ) : null}

          <p className="mt-6 flex items-start gap-2 rounded-xl border border-line-strong bg-surface p-3 text-xs leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" />
            Authentication runs on Supabase. Your password never touches this app&rsquo;s code.
          </p>
        </div>

        {/* Pitch */}
        <aside className="relative hidden lg:block">
          <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-tr from-indigo-500/20 via-fuchsia-500/10 to-cyan-400/20 blur-3xl" />
          <div className="card p-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-brand-300">
              <Sparkles className="h-3.5 w-3.5" />
              Why join
            </span>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-ink">
              Everything you need to be found.
            </h2>

            <ul className="mt-7 space-y-5">
              {PERKS.map((perk) => (
                <li key={perk.title} className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-line-strong bg-brand-500/10 text-brand-300">
                    <perk.icon className="h-5 w-5" />
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
              <a href={`mailto:${SITE.supportEmail}`} className="font-semibold text-brand-300 hover:underline">
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
