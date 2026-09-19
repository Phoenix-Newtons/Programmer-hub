import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../context/ThemeContext";
import { renderWithProviders } from "../../test/render.jsx";

/** Host component that opens `Modal` the way the real pages do. */
function ModalHost({ onClose = () => {} }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          onClose();
        }}
        title="Delete this role?"
        description="Applications stay in your inbox."
      >
        <input aria-label="Reason" placeholder="Reason" />
        <Button variant="ghost">Keep it</Button>
      </Modal>
    </>
  );
}

describe("Modal", () => {
  it("renders nothing until it is opened", async () => {
    const view = await renderWithProviders(<ModalHost />);
    expect(document.querySelector('[role="dialog"]')).toBe(null);
    await view.unmount();
  });

  it("opens as a labelled modal dialog and traps focus inside", async () => {
    const view = await renderWithProviders(<ModalHost />);
    const trigger = view.queryAll("button").find((button) => button.textContent === "Open dialog");

    await view.click(trigger);
    await new Promise((resolve) => setTimeout(resolve, 40)); // focus lands after 20 ms

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe(
      document.querySelector("#" + dialog.getAttribute("aria-labelledby"))?.id
    );
    expect(dialog.querySelector("h2").textContent).toBe("Delete this role?");
    expect(dialog.contains(document.activeElement)).toBe(true);

    await view.unmount();
  });

  it("closes on Escape and hands focus back to the trigger", async () => {
    const onClose = vi.fn();
    const view = await renderWithProviders(<ModalHost onClose={onClose} />);
    const trigger = view.queryAll("button").find((button) => button.textContent === "Open dialog");

    // A real activation focuses the trigger first; the trap restores that.
    trigger.focus();
    await view.click(trigger);
    await new Promise((resolve) => setTimeout(resolve, 40));
    await view.press(document.querySelector('[role="dialog"]'), "Escape");
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(onClose).toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toBe(null);
    expect(document.activeElement).toBe(trigger);

    await view.unmount();
  });
});

describe("theme context", () => {
  it("toggles dark → light and persists the choice", async () => {
    let api = null;
    function ThemeProbe() {
      api = useTheme();
      return (
        <button type="button" onClick={api.toggleTheme}>
          {api.theme}
        </button>
      );
    }

    const view = await renderWithProviders(<ThemeProbe />);
    const toggle = view.query("button");
    const startedDark = document.documentElement.classList.contains("dark");

    await view.click(toggle);

    expect(document.documentElement.classList.contains("dark")).toBe(!startedDark);
    expect(["dark", "light"]).toContain(localStorage.getItem("ph-theme"));
    expect(localStorage.getItem("ph-theme")).toBe(startedDark ? "light" : "dark");
    expect(document.documentElement.style.colorScheme).toBe(startedDark ? "light" : "dark");
    await view.unmount();
  });
});

describe("toast context", () => {
  it("announces a toast in a live region and can be dismissed", async () => {
    function ToastProbe() {
      const toast = useToast();
      return (
        <button type="button" onClick={() => toast.success("Shortlist saved")}>
          Save
        </button>
      );
    }

    const view = await renderWithProviders(<ToastProbe />);
    await view.click(view.query("button"));

    const region = document.querySelector('[aria-live="polite"]');
    expect(region).toBeTruthy();
    expect(region.textContent).toContain("Shortlist saved");

    await view.click(document.querySelector('[aria-label="Dismiss notification"]'));
    expect(document.querySelector('[aria-live="polite"]').textContent).not.toContain("Shortlist saved");

    await view.unmount();
  });
});
