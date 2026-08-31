import { useEffect, useState } from "react";
import { Briefcase, Send, Type } from "lucide-react";
import Modal from "../ui/Modal";
import Field from "../ui/Field";
import Button from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { createJob } from "../../lib/api";
import { JOB_TYPES, EXPERIENCE_LEVELS } from "../../lib/site";
import { friendlyError } from "../../lib/utils";

const EMPTY = {
  title: "",
  company: "",
  location: "Remote",
  type: "Contract",
  level: "Mid-level",
  budget: "",
  skills: "",
  description: "",
  contact_email: "",
};

export default function JobFormModal({ open, onClose, onSaved }) {
  const { user, displayName, profile } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setValues({
      ...EMPTY,
      company: profile?.company || profile?.name || displayName || "",
      contact_email: user?.email || "",
    });
  }, [open, user?.email, displayName, profile]);

  function update(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validate() {
    const next = {};
    if (!values.title.trim()) next.title = "What role are you hiring for?";
    if (!values.company.trim()) next.company = "Add your company or project name.";
    if (!values.description.trim()) next.description = "Describe the role and what success looks like.";
    if (!/^\S+@\S+\.\S+$/.test(values.contact_email)) next.contact_email = "Enter a valid contact email.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user) {
      toast.warning("Sign in to post a role.");
      return;
    }
    if (!validate()) return;

    setSaving(true);
    const payload = {
      user_id: user.id,
      title: values.title.trim(),
      company: values.company.trim(),
      location: values.location.trim() || "Remote",
      type: values.type,
      level: values.level,
      budget: values.budget.trim() || null,
      skills: values.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
      description: values.description.trim(),
      contact_email: values.contact_email.trim(),
    };

    const { error } = await createJob(payload);
    setSaving(false);

    if (error) {
      toast.error(friendlyError(error, "Could not post this role."));
      return;
    }

    toast.success("Role posted. Developers can apply right away.");
    onSaved?.();
    onClose?.();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Post a role"
      description="Reach every developer on the hub. Roles stay live until you delete them."
      icon={Briefcase}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="job-form" loading={saving} icon={Send}>
            Post role
          </Button>
        </>
      }
    >
      <form id="job-form" onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Role title"
            required
            value={values.title}
            onChange={(event) => update("title", event.target.value)}
            error={errors.title}
            placeholder="Senior React Engineer"
          />
          <Field
            label="Company / project"
            required
            value={values.company}
            onChange={(event) => update("company", event.target.value)}
            error={errors.company}
            placeholder="Acme Labs"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Location"
            value={values.location}
            onChange={(event) => update("location", event.target.value)}
            placeholder="Remote / Kampala"
          />
          <Field
            as="select"
            label="Type"
            value={values.type}
            onChange={(event) => update("type", event.target.value)}
          >
            {JOB_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Field>
          <Field
            as="select"
            label="Level"
            value={values.level}
            onChange={(event) => update("level", event.target.value)}
          >
            {EXPERIENCE_LEVELS.filter((level) => level !== "Any").map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Budget / salary"
            hint="optional"
            value={values.budget}
            onChange={(event) => update("budget", event.target.value)}
            placeholder="$1,500 – $3,000 / month"
          />
          <Field
            label="Skills"
            hint="comma separated"
            value={values.skills}
            onChange={(event) => update("skills", event.target.value)}
            error={errors.skills}
            placeholder="React, TypeScript, Node.js"
          />
        </div>

        <Field
          as="textarea"
          label="Role description"
          required
          value={values.description}
          onChange={(event) => update("description", event.target.value)}
          error={errors.description}
          placeholder="What you're building, the stack, the timeline and how to apply."
          maxLength={1200}
        />

        <Field
          label="Applications go to"
          type="email"
          required
          value={values.contact_email}
          onChange={(event) => update("contact_email", event.target.value)}
          error={errors.contact_email}
          placeholder="hiring@company.com"
        />
      </form>
    </Modal>
  );
}
