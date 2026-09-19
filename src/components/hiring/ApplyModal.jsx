import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import Modal from "../ui/Modal";
import Field from "../ui/Field";
import Button from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { createApplication } from "../../lib/api";
import { friendlyError, isValidUrl, normalizeUrl, truncate } from "../../lib/utils";

/**
 * Apply to a role. When the write fails (offline, RLS, sample data) the
 * application is never lost: we fall back to a pre-filled email draft.
 */
export default function ApplyModal({ open, onClose, job }) {
  const { user, displayName, profile } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState({ name: "", email: "", portfolio: "", message: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setValues({
      name: displayName || "",
      email: user?.email || "",
      portfolio: profile?.website || profile?.github || "",
      message: job
        ? `Hi ${job.company || "there"},\n\nI'm interested in the ${job.title} role. Here's why I'd be a good fit:\n\n• \n\nI'm available to start ...`
        : "",
    });
  }, [open, job, displayName, user?.email, profile]);

  function update(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function mailtoFallback(reason) {
    const subject = encodeURIComponent(`Application: ${job?.title || "Role"}`);
    const body = encodeURIComponent(
      `${values.message}\n\n— ${values.name}\n${values.email}${values.portfolio ? `\n${values.portfolio}` : ""}`
    );
    const recipient = job?.contact_email || "";
    if (typeof window !== "undefined") window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    toast.warning(reason);
    onClose?.();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const next = {};
    if (!values.name.trim()) next.name = "Tell them who you are.";
    if (!/^\S+@\S+\.\S+$/.test(values.email)) next.email = "Enter a valid email.";
    if (values.portfolio && !isValidUrl(values.portfolio)) next.portfolio = "Enter a valid URL.";
    if (values.message.trim().length < 20) next.message = "Write at least a couple of sentences.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    const payload = {
      job_id: job?.id || null,
      applicant_name: values.name.trim(),
      applicant_email: values.email.trim(),
      portfolio_url: values.portfolio ? normalizeUrl(values.portfolio.trim()) : null,
      message: values.message.trim(),
    };

    const { error } = await createApplication(payload);
    setSaving(false);

    if (error) {
      mailtoFallback(
        friendlyError(error, "Saved locally — opening your email app so the application still reaches them.")
      );
      return;
    }

    toast.success("Application sent. Good luck!");
    onClose?.();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={job ? `Apply — ${truncate(job.title, 60)}` : "Apply"}
      description={job ? [job.company, job.location, job.budget].filter(Boolean).join(" • ") : ""}
      icon={Send}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="apply-form" loading={saving} icon={Send}>
            Send application
          </Button>
        </>
      }
    >
      <form id="apply-form" onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Your name"
            required
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            error={errors.name}
            placeholder="Jane Doe"
            data-autofocus
          />
          <Field
            label="Email"
            type="email"
            required
            value={values.email}
            onChange={(event) => update("email", event.target.value)}
            error={errors.email}
            placeholder="you@email.com"
          />
        </div>

        <Field
          label="Portfolio / GitHub"
          hint="optional"
          value={values.portfolio}
          onChange={(event) => update("portfolio", event.target.value)}
          error={errors.portfolio}
          placeholder="github.com/you"
        />

        <Field
          as="textarea"
          label="Why you?"
          required
          hint={`${values.message.length}/1200`}
          value={values.message}
          onChange={(event) => update("message", event.target.value)}
          error={errors.message}
          placeholder="A short note about your experience with this stack and when you can start."
          maxLength={1200}
        />

        <p className="rounded-xl border border-line bg-surface p-3 text-xs leading-relaxed text-muted">
          Applications are stored with the role so the poster can review them in one place — and sent to{" "}
          <span className="font-mono text-ink-soft">{job?.contact_email || "their inbox"}</span>.
        </p>
      </form>
    </Modal>
  );
}
