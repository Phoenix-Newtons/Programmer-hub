import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import usePersistentForm from "../usePersistentForm";

const { renderWithProviders } = await import("../../test/render.jsx");

const KEY = "ph:draft:test-form";

function Probe() {
  const form = usePersistentForm(KEY, { message: "", name: "" });
  return (
    <div>
      <input
        aria-label="message"
        value={form.values.message}
        onChange={(event) => form.setValue("message", event.target.value)}
      />
      <span>{form.restored ? "Draft restored from backup" : "no draft"}</span>
      <span>{form.dirty ? "dirty" : "clean"}</span>
      <button type="button" onClick={form.clearDraft}>
        Submit (clears)
      </button>
    </div>
  );
}

async function sleep(ms) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

describe("usePersistentForm", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves typed input to localStorage after the 500 ms debounce", async () => {
    const view = await renderWithProviders(<Probe />);
    await view.type(view.query('input[aria-label="message"]'), "Hello Ada");
    expect(localStorage.getItem(KEY)).toBeNull(); // still inside the debounce window
    await sleep(600);
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({ message: "Hello Ada", name: "" });
    await view.unmount();
  });

  it("restores a backed-up draft on mount and flags it", async () => {
    localStorage.setItem(KEY, JSON.stringify({ message: "Recovered hello", name: "" }));
    const view = await renderWithProviders(<Probe />);
    expect(view.query('input[aria-label="message"]').value).toBe("Recovered hello");
    expect(view.text()).toContain("Draft restored from backup");
    await view.unmount();
  });

  it("clears the backup only when clearDraft is called (successful submit)", async () => {
    localStorage.setItem(KEY, JSON.stringify({ message: "Send me", name: "" }));
    const view = await renderWithProviders(<Probe />);
    const submit = view.queryAll("button").find((button) => button.textContent.includes("Submit"));
    await view.click(submit);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(view.query('input[aria-label="message"]').value).toBe("");
    // The emptied form must not resurrect itself as a fresh draft.
    await sleep(600);
    expect(localStorage.getItem(KEY)).toBeNull();
    await view.unmount();
  });
});
