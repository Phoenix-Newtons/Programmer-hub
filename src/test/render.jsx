import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../context/ThemeContext";
import { ToastProvider } from "../context/ToastContext";
import { AuthProvider } from "../context/AuthContext";

/**
 * Renders a component with the same provider stack as `main.jsx`, inside jsdom,
 * and waits for effects/flushes to settle. Dependency-free replacement for
 * @testing-library/react so the test suite stays lean.
 *
 *   const { container, click, unmount } = await renderWithProviders(<Page />);
 */
export async function renderWithProviders(ui, { route = "/" } = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <ThemeProvider>
        <MemoryRouter initialEntries={[route]}>
          <ToastProvider>
            <AuthProvider>{ui}</AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      </ThemeProvider>
    );
  });

  // Flush pending promises (data fetches) and the resulting re-renders.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const query = (selector) => container.querySelector(selector);
  const queryAll = (selector) => Array.from(container.querySelectorAll(selector));

  const click = async (element) => {
    if (!element) throw new Error("click() received a missing element");
    await act(async () => {
      element.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };

  /** Dispatches a keyboard event from `target` (default: the document). */
  const press = async (target, key, init = {}) => {
    const node = target || document;
    await act(async () => {
      node.dispatchEvent(
        new window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init })
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };

  const type = async (input, value) => {
    if (!input) throw new Error("type() received a missing input");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      if (setter) setter.call(input, value);
      else input.value = value;
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 320)); // debounce + fetch
    });
  };

  return {
    container,
    root,
    query,
    queryAll,
    click,
    press,
    type,
    text: () => container.textContent.replace(/\s+/g, " ").trim(),
    unmount: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}
