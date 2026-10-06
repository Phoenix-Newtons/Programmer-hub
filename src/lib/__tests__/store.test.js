import { describe, expect, it, vi } from "vitest";
import { createStore } from "../store";

describe("createStore", () => {
  it("holds the initial state", () => {
    const store = createStore({ count: 0 });
    expect(store.get()).toEqual({ count: 0 });
  });

  it("accepts a value or an updater", () => {
    const store = createStore({ count: 0 });
    store.set({ count: 5 });
    expect(store.get().count).toBe(5);
    store.set((state) => ({ count: state.count + 1 }));
    expect(store.get().count).toBe(6);
  });

  it("notifies subscribers and supports unsubscribe", () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.set({ count: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.set({ count: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("skips notifying when nothing changed", () => {
    const store = createStore({ count: 0, label: "a" });
    const listener = vi.fn();
    store.subscribe(listener);
    store.set({ count: 0, label: "a" });
    expect(listener).not.toHaveBeenCalled();
  });

  it("persists to localStorage and rehydrates (merged with defaults)", () => {
    const first = createStore({ count: 0, extra: "keep" }, { storageKey: "test:store" });
    first.set({ count: 3, extra: "keep" });

    const second = createStore({ count: 0, extra: "keep" }, { storageKey: "test:store" });
    expect(second.get().count).toBe(3);
  });

  it("survives corrupted stored JSON", () => {
    localStorage.setItem("test:corrupt", "{not json");
    const store = createStore({ count: 7 }, { storageKey: "test:corrupt" });
    expect(store.get().count).toBe(7);
  });

  it("reset returns to the original state", () => {
    const store = createStore({ count: 0 }, { storageKey: "test:reset" });
    store.set({ count: 9 });
    store.reset();
    expect(store.get().count).toBe(0);
  });
});
