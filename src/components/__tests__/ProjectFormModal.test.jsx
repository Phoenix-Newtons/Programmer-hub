import { act, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectFormModal from "../projects/ProjectFormModal";
import { renderWithProviders } from "../../test/render.jsx";

vi.mock("../../lib/api", async () => {
  const actual = await vi.importActual("../../lib/api");
  return {
    ...actual,
    createProject: vi.fn(async (payload) => ({ data: { id: "proj-new", ...payload }, error: null })),
    updateProject: vi.fn(async (id, payload) => ({ data: { id, ...payload }, error: null })),
  };
});

async function typeCharByChar(element, text) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value")?.set;
  let current = element.value || "";
  for (const char of text) {
    current += char;
    await act(async () => {
      setter.call(element, current);
      element.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    // Wait longer than useFocusTrap's 20ms initial focus timeout after each character.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(document.activeElement).toBe(element);
    expect(element.value).toBe(current);
  }
}

describe("ProjectFormModal", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps writing focus inside every field when typing character by character in Publish a project", async () => {
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Publish a project
          </button>
          <ProjectFormModal open={open} onClose={() => setOpen(false)} onSaved={() => {}} />
        </>
      );
    }

    const view = await renderWithProviders(<Host />);
    const trigger = view.query("button");
    trigger.focus();
    await view.click(trigger);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();

    const titleInput = dialog.querySelector('input[placeholder*="Kampala Bus Tracker"]');
    const descriptionInput = dialog.querySelector("textarea");
    const tagsInput = dialog.querySelector('input[placeholder*="React, Supabase"]');
    const repoInput = dialog.querySelector('input[placeholder*="github.com"]');
    const liveInput = dialog.querySelector('input[placeholder*="vercel.app"]');
    const coverInput = dialog.querySelector('input[placeholder*="screenshot.png"]');

    // Initial focus lands directly on the Project title input (not the header close button).
    expect(document.activeElement).toBe(titleInput);

    // Typing character-by-character into every single field keeps focus on that field.
    await typeCharByChar(titleInput, "Kampala Bus");

    descriptionInput.focus();
    await typeCharByChar(descriptionInput, "Real-time transit tracker.");

    tagsInput.focus();
    await typeCharByChar(tagsInput, "React, Mobile");

    repoInput.focus();
    await typeCharByChar(repoInput, "github.com/dev/bus");

    liveInput.focus();
    await typeCharByChar(liveInput, "bus.vercel.app");

    coverInput.focus();
    await typeCharByChar(coverInput, "https://example.com/shot.png");

    await view.unmount();
  });

  it("preserves typed values when parent re-renders with a refreshed project prop", async () => {
    const baseProject = {
      id: "proj-42",
      title: "Old Title",
      description: "Initial description",
      tags: ["React"],
      repo_url: "https://github.com/dev/repo",
      live_url: "",
      cover_url: "",
    };

    function EditHost() {
      const [tick, setTick] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setTick((n) => n + 1)}>
            Background refresh {tick}
          </button>
          <ProjectFormModal open project={{ ...baseProject }} onClose={() => {}} onSaved={() => {}} />
        </>
      );
    }

    const view = await renderWithProviders(<EditHost />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });

    const dialog = document.querySelector('[role="dialog"]');
    const titleInput = dialog.querySelector('input[placeholder*="Kampala Bus Tracker"]');
    expect(titleInput.value).toBe("Old Title");

    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    await act(async () => {
      setter.call(titleInput, "Updated Title");
      titleInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    expect(titleInput.value).toBe("Updated Title");

    // Simulate a background collection refresh creating a fresh project object reference.
    await view.click(view.query("button"));
    expect(titleInput.value).toBe("Updated Title");

    await view.unmount();
  });
});
