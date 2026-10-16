import { afterEach, describe, expect, it } from "vitest";

import ProjectCard from "../cards/ProjectCard";
import { renderWithProviders } from "../../test/render.jsx";

/**
 * Projects are embedded: the live URL must open inside the hub in a sandboxed
 * iframe window instead of sending visitors away in a new tab.
 */
const project = {
  id: "project-1",
  title: "Kampala Bus Tracker",
  description: "Live vehicle positions for commuters.",
  tags: ["React", "Supabase"],
  live_url: "https://bus-tracker.example.com",
  repo_url: "https://github.com/example/bus-tracker",
};

async function settle(ms = 40) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe("ProjectCard → project window", () => {
  afterEach(() => {
    document.querySelectorAll('[role="dialog"]').forEach((node) => node.remove());
  });

  it("opens the live URL in a sandboxed iframe", async () => {
    const view = await renderWithProviders(<ProjectCard project={project} />);

    const preview = view.queryAll("button").find((button) => button.textContent.includes("Preview live"));
    expect(preview).toBeTruthy();
    await view.click(preview);
    await settle();

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-modal")).toBe("true");

    const frame = dialog.querySelector("iframe");
    expect(frame.getAttribute("src")).toBe("https://bus-tracker.example.com");
    expect(frame.getAttribute("title")).toContain("Kampala Bus Tracker");

    const sandbox = frame.getAttribute("sandbox") || "";
    expect(sandbox).toContain("allow-scripts");
    expect(sandbox).not.toContain("allow-top-navigation");

    await view.unmount();
  });

  it("keeps an escape hatch to a real tab", async () => {
    const view = await renderWithProviders(<ProjectCard project={project} />);
    const link = view.queryAll("a").find((anchor) => anchor.getAttribute("href") === project.live_url);

    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    await view.unmount();
  });

  it("offers nothing to preview without a live URL", async () => {
    const view = await renderWithProviders(
      <ProjectCard project={{ ...project, live_url: "", repo_url: "" }} />
    );

    expect(view.queryAll("button").some((button) => button.textContent.includes("Preview live"))).toBe(false);
    await view.unmount();
  });
});
