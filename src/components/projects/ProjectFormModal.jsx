import { useEffect, useState } from "react";
import { Save, Tags } from "lucide-react";

import Modal from "../ui/Modal";
import Field from "../ui/Field";
import Button from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { createProject, updateProject } from "../../lib/api";
import { cn, friendlyError, isValidUrl, normalizeUrl, normalizeList } from "../../lib/utils";
import { PROJECT_FILTERS } from "../../lib/site";

const EMPTY = {
  title: "",
  description: "",
  tags: "",
  repo_url: "",
  live_url: "",
  cover_url: "",
};

export default function ProjectFormModal({ open, onClose, onSaved, project }) {
  const { user, displayName } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(project?.id);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setValues(
      project
        ? {
            title: project.title || "",
            description: project.description || "",
            tags: Array.isArray(project.tags) ? project.tags.join(", ") : project.tags || "",
            repo_url: project.repo_url || "",
            live_url: project.live_url || "",
            cover_url: project.cover_url || "",
          }
        : EMPTY
    );
  }, [open, project]);

  function update(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validate() {
    const next = {};
    if (!values.title.trim()) next.title = "Give your project a title.";
    if (values.title.trim().length > 90) next.title = "Keep the title under 90 characters.";
    if (!values.description.trim()) next.description = "Describe what you built.";
    ["repo_url", "live_url", "cover_url"].forEach((key) => {
      if (values[key] && !isValidUrl(values[key])) next[key] = "Enter a valid URL.";
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user) {
      toast.warning("Sign in with Google or email to publish a project.");
      return;
    }
    if (!validate()) return;

    setSaving(true);
    const payload = {
      user_id: user.id,
      author_name: displayName || user.email?.split("@")[0] || "Anonymous",
      title: values.title.trim(),
      description: values.description.trim(),
      tags: normalizeList(values.tags),
      repo_url: values.repo_url ? normalizeUrl(values.repo_url.trim()) : null,
      live_url: values.live_url ? normalizeUrl(values.live_url.trim()) : null,
      cover_url: values.cover_url ? normalizeUrl(values.cover_url.trim()) : null,
    };

    const { error } = isEditing
      ? await updateProject(project.id, payload)
      : await createProject({ ...payload, featured: false });
    setSaving(false);

    if (error) {
      toast.error(
        friendlyError(error, isEditing ? "Could not save your changes." : "Could not publish the project.")
      );
      return;
    }

    toast.success(isEditing ? "Project updated." : "Project published. Nice work!");
    onSaved?.();
    onClose?.();
  }

  /** Adds one of the suggested tags without losing what's already typed. */
  function toggleTag(tag) {
    const current = normalizeList(values.tags);
    const exists = current.some((item) => item.toLowerCase() === tag.toLowerCase());
    update(
      "tags",
      exists
        ? current.filter((item) => item.toLowerCase() !== tag.toLowerCase()).join(", ")
        : [...current, tag].join(", ")
    );
  }

  const activeTags = normalizeList(values.tags).map((tag) => tag.toLowerCase());

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? "Edit project" : "Publish a project"}
      description="Shipped work only — repo link, live URL and a short description of what you built."
      icon={Save}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="project-form" loading={saving} icon={Save}>
            {project ? "Save changes" : "Publish project"}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={handleSubmit} className="grid gap-4">
        <Field
          label="Project title"
          required
          value={values.title}
          onChange={(event) => update("title", event.target.value)}
          error={errors.title}
          placeholder="e.g. Kampala Bus Tracker"
          maxLength={90}
        />

        <Field
          as="textarea"
          label="What does it do?"
          required
          value={values.description}
          onChange={(event) => update("description", event.target.value)}
          error={errors.description}
          placeholder="Two or three sentences about the problem, your solution and the stack you used."
          maxLength={600}
        />

        <div>
          <Field
            label="Tags"
            hint="comma separated"
            value={values.tags}
            onChange={(event) => update("tags", event.target.value)}
            placeholder="React, Supabase, Mobile"
            error={errors.tags}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PROJECT_FILTERS.filter((tag) => tag !== "All").map((tag) => {
              const active = activeTags.includes(tag.toLowerCase());
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold transition",
                    active
                      ? "border-transparent bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white"
                      : "border-line-strong bg-surface text-muted hover:border-brand-400/50 hover:text-ink"
                  )}
                >
                  {active ? "✓ " : "+ "}
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Repository URL"
            value={values.repo_url}
            onChange={(event) => update("repo_url", event.target.value)}
            error={errors.repo_url}
            placeholder="github.com/you/project"
          />
          <Field
            label="Live URL"
            value={values.live_url}
            onChange={(event) => update("live_url", event.target.value)}
            error={errors.live_url}
            placeholder="your-project.vercel.app"
          />
        </div>

        <Field
          label="Cover image URL"
          hint="optional"
          value={values.cover_url}
          onChange={(event) => update("cover_url", event.target.value)}
          error={errors.cover_url}
          placeholder="https://…/screenshot.png"
        />

        <p className="flex items-start gap-2 rounded-xl border border-line-strong bg-surface p-3 text-xs leading-relaxed text-muted">
          <Tags className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" />
          Projects are public. Anyone on the hub can open your repo and live links, so share work you&rsquo;re
          proud of.
        </p>
      </form>
    </Modal>
  );
}
