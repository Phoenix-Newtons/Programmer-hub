import { beforeEach, describe, expect, it } from "vitest";
import {
  addEntry,
  clearShortlist,
  getShortlistIds,
  isShortlisted,
  removeEntry,
  removeShortlist,
  saveToShortlist,
  shortlistStore,
  getShortlistEmails,
  getShortlistWhatsApps,
  shortlistMailto,
  syncShortlist,
  toEntry,
  toggleShortlist,
} from "../shortlist";

const PROFILE = {
  id: "dev-1",
  name: "Ada Nakato",
  title: "Full-stack engineer",
  location: "Kampala",
  skills: ["React", "TypeScript"],
  rating: 4.8,
  open_to_work: true,
  email: "ada@example.com",
};

describe("shortlist entry shape", () => {
  it("reduces a profile to the fields the list needs", () => {
    const entry = toEntry(PROFILE);
    expect(entry).toMatchObject({ id: "dev-1", name: "Ada Nakato", rating: 4.8, open_to_work: true });
    expect(entry.saved_at).toBeTruthy();
  });

  it("copes with partial rows", () => {
    expect(toEntry({ id: "x" }).name).toBe("Unnamed developer");
  });
});

describe("pure transitions", () => {
  it("adds entries to the front", () => {
    let state = { ids: [], items: {} };
    state = addEntry(state, { id: "a", name: "A" });
    state = addEntry(state, { id: "b", name: "B" });
    expect(state.ids).toEqual(["b", "a"]);
  });

  it("re-adding refreshes the snapshot without duplicating the id", () => {
    let state = addEntry({ ids: [], items: {} }, { id: "a", name: "A" });
    state = addEntry(state, { id: "a", name: "A (updated)" });
    expect(state.ids).toEqual(["a"]);
    expect(state.items.a.name).toBe("A (updated)");
  });

  it("ignores entries without an id", () => {
    const state = { ids: [], items: {} };
    expect(addEntry(state, { name: "no id" })).toBe(state);
  });

  it("removes by id", () => {
    const state = addEntry({ ids: [], items: {} }, { id: "a" });
    expect(removeEntry(state, "a")).toEqual({ ids: [], items: {} });
  });

  it("removing an unknown id is a no-op", () => {
    const state = { ids: [], items: {} };
    expect(removeEntry(state, "nope")).toBe(state);
  });
});

describe("store API", () => {
  beforeEach(() => {
    clearShortlist();
  });

  it("toggles on and off", () => {
    toggleShortlist(PROFILE);
    expect(isShortlisted("dev-1")).toBe(true);
    expect(getShortlistIds()).toEqual(["dev-1"]);

    toggleShortlist(PROFILE);
    expect(isShortlisted("dev-1")).toBe(false);
    expect(getShortlistIds()).toEqual([]);
  });

  it("persists to localStorage", () => {
    saveToShortlist(PROFILE);
    const stored = JSON.parse(localStorage.getItem("ph:shortlist"));
    expect(stored.ids).toEqual(["dev-1"]);
  });

  it("removeShortlist drops the entry", () => {
    saveToShortlist(PROFILE);
    removeShortlist("dev-1");
    expect(getShortlistIds()).toEqual([]);
  });

  it("syncShortlist refreshes stale snapshots but keeps saved_at", () => {
    saveToShortlist(PROFILE);
    const before = shortlistStore.get().items["dev-1"];
    syncShortlist([{ ...PROFILE, title: "Staff engineer", rating: 5 }]);
    const after = shortlistStore.get().items["dev-1"];
    expect(after.title).toBe("Staff engineer");
    expect(after.saved_at).toBe(before.saved_at);
  });

  it("syncShortlist ignores profiles that are not saved", () => {
    saveToShortlist(PROFILE);
    syncShortlist([{ id: "someone-else", name: "Other" }]);
    expect(getShortlistIds()).toEqual(["dev-1"]);
  });
});

describe("bulk contact helpers", () => {
  const list = [
    { id: "a", email: " A@Example.com ", whatsapp: "+256 700 111 222" },
    { id: "b", email: "a@example.com", whatsapp: "+256700111222" },
    { id: "c", email: "", whatsapp: "123" },
    { id: "d" },
  ];

  it("collects unique emails, trimmed and in list order", () => {
    expect(getShortlistEmails(list)).toEqual(["A@Example.com"]);
    expect(getShortlistEmails([])).toEqual([]);
  });

  it("normalises WhatsApp numbers to digits and skips short ones", () => {
    expect(getShortlistWhatsApps(list)).toEqual(["256700111222"]);
  });

  it("builds a mailto draft and returns an empty string without emails", () => {
    expect(shortlistMailto(list)).toContain("mailto:A@Example.com?subject=");
    expect(shortlistMailto([{ id: "x" }])).toBe("");
  });
});
