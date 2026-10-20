import { afterEach, describe, expect, it } from "vitest";
import { InstallAppButton } from "../layout/InstallApp";
import { __setInstallStateForTests } from "../../lib/installApp";

const { renderWithProviders } = await import("../../test/render.jsx");

async function settle(ms = 40) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe("InstallAppButton", () => {
  afterEach(() => {
    __setInstallStateForTests({ deferredPrompt: null, installed: false });
    document.querySelectorAll('[role="dialog"]').forEach((node) => node.remove());
    sessionStorage.clear();
  });

  it("renders an install call to action", async () => {
    const view = await renderWithProviders(<InstallAppButton />);
    const button = view
      .queryAll("button")
      .find((item) => item.getAttribute("aria-label") === "Install the Programmer's Hub app");
    expect(button).toBeTruthy();
    expect(button.textContent).toContain("Install app");
    await view.unmount();
  });

  it("opens guided install instructions when no native prompt is captured", async () => {
    const view = await renderWithProviders(<InstallAppButton />);
    const button = view
      .queryAll("button")
      .find((item) => item.getAttribute("aria-label") === "Install the Programmer's Hub app");
    await view.click(button);
    await settle();

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain("Get the app");
    expect(dialog.textContent).toContain("works everywhere");
    await view.unmount();
  });

  it("shows the installed state once the app is on the device", async () => {
    __setInstallStateForTests({ deferredPrompt: null, installed: true });
    const view = await renderWithProviders(<InstallAppButton />);
    expect(view.text()).toContain("App installed");
    await view.unmount();
  });
});
