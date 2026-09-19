import { describe, expect, it } from "vitest";
import useCollection from "../useCollection";
import { renderWithProviders } from "../../test/render.jsx";

/** Renders the hook and exposes its latest result to the test. */
async function renderHook(fetcher, deps = []) {
  const box = { current: null };
  function Probe() {
    box.current = useCollection(fetcher, deps);
    return null;
  }
  const view = await renderWithProviders(<Probe />);
  return { box, view };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe("useCollection", () => {
  it("loads rows and clears the loading flag", async () => {
    const { box, view } = await renderHook(async () => ({ data: [{ id: "a" }], error: null }));
    await sleep(10);

    expect(box.current.data).toEqual([{ id: "a" }]);
    expect(box.current.loading).toBe(false);
    expect(box.current.error).toBe(null);
    await view.unmount();
  });

  it("reports empty collections through isEmpty", async () => {
    const { box, view } = await renderHook(async () => ({ data: [], error: null }));
    await sleep(10);

    expect(box.current.isEmpty).toBe(true);
    await view.unmount();
  });

  it("surfaces fetcher errors and drops stale rows", async () => {
    const { box, view } = await renderHook(async () => {
      throw new Error("network down");
    });
    await sleep(10);

    expect(box.current.error).toBeInstanceOf(Error);
    expect(box.current.data).toEqual([]);
    expect(box.current.isEmpty).toBe(false); // an error is not an empty state
    await view.unmount();
  });

  it("silent refresh swaps rows without showing the loading state", async () => {
    let rows = [{ id: "a" }];
    const { box, view } = await renderHook(async () => ({ data: rows, error: null }));
    await sleep(10);

    rows = [{ id: "b" }, { id: "c" }];
    const promise = box.current.refresh({ silent: true });
    expect(box.current.loading).toBe(false); // stayed quiet on purpose

    await promise;
    await sleep(10);
    expect(box.current.loading).toBe(false);
    expect(box.current.data).toEqual([{ id: "b" }, { id: "c" }]);
    await view.unmount();
  });

  it("never lets a slow response overwrite a newer one", async () => {
    const fetched = [];
    const fetcher = () => {
      const index = fetched.length;
      fetched.push(index);
      return new Promise((resolve) =>
        setTimeout(
          () => resolve({ data: [{ id: `row-${index}` }], error: null }),
          index === 0 ? 40 : 5
        )
      );
    };

    const { box, view } = await renderHook(fetcher);
    await sleep(8); // the first (slow) request is still in flight
    await box.current.refresh({ silent: true });
    await sleep(60);

    expect(box.current.data).toEqual([{ id: "row-1" }]);
    await view.unmount();
  });
});
