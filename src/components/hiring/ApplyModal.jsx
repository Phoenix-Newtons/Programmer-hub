import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import Modal from "../ui/Modal";
import Field from "../ui/Field";
import Button from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { createApplication } from "../../lib/api";
import { friendlyError, isValidUrl, normalizeUrl } from "../../lib/utils";

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
      message: job ? `Hi ${job.company || "there"},\n\nI'm interested in the ${job.title} role…` : "",
    });
  }, [open, job, displayName, user?.email, profile]);

  function update(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
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
      // Fall back to email so the application never gets lost.
      const subject = encodeURIComponent(`Application: ${job?.title || "Role"}`);
      const body = encodeURIComponent(
        `${values.message}\n\n— ${values.name}\n${values.email}\n${values.portfolio}`
      );
      window.location.href = `mailto:${job?.contact_email || ""}?subject=${subject}&body=${body}`;
      toast.warning(
        friendlyError(error, "Saved locally — opening your email app so the application still reaches them.")
      );
      onClose?.();
      return;
    }

    toast.success("Application sent. Good luck!");
    onClose?.();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={job ? `Apply — ${job.title}` : "Apply"}
      description={job ? `${job.company} • ${job.location}` : ""}
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
          value={values.message}
          onChange={(event) => update("message", event.target.value)}
          error={errors.message}
          placeholder="A short note about your experience with this stack and when you can start."
          maxLength={1200}
        />
      </form>
    </Modal>
  );
}
