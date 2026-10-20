import { describe, expect, it, vi } from "vitest";
import useHubRealtime, { describeHubEvent } from "../useHubRealtime";

const { renderWithProviders } = await import("../../test/render.jsx");

describe("describeHubEvent", () => {
  it("turns a project INSERT into a rocket banner with a +1 delta", () => {
    const event = describeHubEvent({
      table: "projects",
      eventType: "INSERT",
      new: { id: "p1", author_name: "Ada Nakato" },
    });
    expect(event.message).toBe("🚀 New project uploaded by Ada Nakato");
    expect(event.delta).toBe(1);
    expect(event.icon).toBe("rocket");
  });

  it("turns a job INSERT into a briefcase banner", () => {
    const event = describeHubEvent({
      table: "jobs",
      eventType: "INSERT",
      new: { id: "j1", company: "PayBridge" },
    });
    expect(event.message).toBe("💼 PayBridge just posted a new role!");
    expect(event.delta).toBe(1);
  });

  it("gives DELETE a −1 delta and UPDATE a neutral one", () => {
    expect(describeHubEvent({ table: "profiles", eventType: "DELETE", old: { name: "Ada" } }).delta).toBe(-1);
    expect(describeHubEvent({ table: "profiles", eventType: "UPDATE", new: { name: "Ada" } }).delta).toBe(0);
  });
});

/** Fake Supabase client: captures handlers and fires one payload on subscribe. */
function fakeClient() {
  const handlers = {};
  const channel = {
    on(type, filter, handler) {
      if (type === "postgres_changes") handlers[filter.table] = handler;
      return channel;
    },
    subscribe(callback) {
      callback("SUBSCRIBED");
      handlers.projects?.({
        table: "projects",
        eventType: "INSERT",
        new: { id: "p9", author_name: "Grace Achieng" },
      });
      return channel;
    },
  };
  return { channel: vi.fn(() => channel), removeChannel: vi.fn() };
}

function Probe({ client }) {
  const realtime = useHubRealtime("test-channel", { client, bannerMs: 0 });
  return (
    <div>
      <span>{realtime.status}</span>
      <span>{realtime.activity?.message || "no activity"}</span>
      <span>projects-delta:{realtime.deltas.projects}</span>
    </div>
  );
}

describe("useHubRealtime", () => {
  it("subscribes to all three tables, surfaces the banner and bumps the delta", async () => {
    const client = fakeClient();
    const view = await renderWithProviders(<Probe client={client} />);
    const text = view.text();
    expect(client.channel).toHaveBeenCalledWith("test-channel");
    expect(text).toContain("live");
    expect(text).toContain("🚀 New project uploaded by Grace Achieng");
    expect(text).toContain("projects-delta:1");
    await view.unmount();
    expect(client.removeChannel).toHaveBeenCalled();
  });

  it("reports offline when no usable client is provided", async () => {
    const view = await renderWithProviders(<Probe client={{}} />);
    expect(view.text()).toContain("offline");
    await view.unmount();
  });
});
