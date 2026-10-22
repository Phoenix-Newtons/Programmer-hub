import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertSafeTarget,
  buildForwardHeaders,
  filterResponseHeaders,
  isHostAllowed,
  isPrivateAddress,
  parseTargetUrl,
  rewriteHtml,
} from "../../../server/proxy-core.mjs";
import { createProxyApp } from "../../../server/preview-proxy.mjs";

describe("proxy core — URL + SSRF guards", () => {
  it("accepts http(s) and rejects other protocols and embedded credentials", () => {
    expect(parseTargetUrl("https://example.com/page").ok).toBe(true);
    expect(parseTargetUrl("file:///etc/passwd").ok).toBe(false);
    expect(parseTargetUrl("javascript:alert(1)").ok).toBe(false);
    expect(parseTargetUrl("https://user:pass@example.com").ok).toBe(false);
    expect(parseTargetUrl("not a url").ok).toBe(false);
  });

  it("flags private, loopback and metadata addresses", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.5",
      "172.16.4.2",
      "192.168.1.9",
      "169.254.169.254",
      "::1",
      "fd00::1",
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    expect(isPrivateAddress("93.184.216.34")).toBe(false);
    expect(isPrivateAddress("2606:4700:4700::1111")).toBe(false);
  });

  it("blocks literal private IPs and off-allowlist hosts", async () => {
    await expect(assertSafeTarget(new URL("http://127.0.0.1:5173/"))).resolves.toMatchObject({ ok: false });
    await expect(
      assertSafeTarget(new URL("https://evil.example.net/"), { allowedHosts: ["*.vercel.app"] })
    ).resolves.toMatchObject({ ok: false });
    expect(isHostAllowed("app.vercel.app", ["*.vercel.app"])).toBe(true);
    expect(isHostAllowed("vercel.app", ["*.vercel.app"])).toBe(false);
  });

  it("never forwards host/cookies/auth to the target", () => {
    const headers = buildForwardHeaders({
      host: "hub.example",
      cookie: "session=secret",
      authorization: "Bearer token",
      "accept-encoding": "gzip",
    });
    expect(headers.host).toBeUndefined();
    expect(headers.cookie).toBeUndefined();
    expect(headers.authorization).toBeUndefined();
    expect(headers["user-agent"]).toContain("Mozilla/5.0");
  });
});

describe("proxy core — header stripping + HTML rewriting", () => {
  it("strips framing blockers and cookies from upstream responses", () => {
    const filtered = filterResponseHeaders({
      "x-frame-options": "DENY",
      "content-security-policy": "frame-ancestors 'none'",
      "x-webkit-csp": "frame-ancestors 'none'",
      "clear-site-data": '"*"',
      "set-cookie": "id=1",
      "content-type": "text/html",
    });
    expect(Object.keys(filtered)).toEqual(["content-type"]);
  });

  it("removes meta CSP, drops the old base and injects the target base", () => {
    const html = `<html><head><base href="/old"><meta http-equiv="Content-Security-Policy" content="frame-ancestors 'none'"><title>x</title></head><body>hi</body></html>`;
    const out = rewriteHtml(html, "https://example.com/app/");
    expect(out).not.toMatch(/content-security-policy/i);
    expect(out).not.toContain('href="/old"');
    expect(out).toContain('<base href="https://example.com/app/">');
    expect(out.indexOf("<base")).toBeLessThan(out.indexOf("<title>"));
  });
});

describe("preview proxy endpoint", () => {
  let server;
  let base;

  beforeAll(async () => {
    const fetchFn = async () =>
      new Response(
        `<html><head><title>Demo</title><meta http-equiv="Content-Security-Policy" content="default-src 'none'"></head><body><h1>Framed!</h1></body></html>`,
        {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "x-frame-options": "DENY",
            "content-security-policy": "frame-ancestors 'none'",
            "set-cookie": "tracker=1",
          },
        }
      );
    const app = createProxyApp({
      fetchFn,
      serveDemo: false,
      config: {
        allowedHosts: [],
        allowPrivate: true,
        timeoutMs: 2000,
        maxBytes: 1024 * 1024,
        frameAncestors: ["'self'"],
      },
    });
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it("returns rewritten HTML with the framing headers stripped", async () => {
    const response = await fetch(`${base}/proxy?url=${encodeURIComponent("https://example.com/app")}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-frame-options")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    // Our own policy replaces the stripped one.
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'self'");
    const body = await response.text();
    expect(body).toContain('<base href="https://example.com/app">');
    expect(body).toContain("Framed!");
    expect(body).not.toMatch(/http-equiv="Content-Security-Policy"/i);
  });

  it("rejects missing and unsafe URLs before fetching", async () => {
    expect((await fetch(`${base}/proxy`)).status).toBe(400);
    const file = await fetch(`${base}/proxy?url=${encodeURIComponent("file:///etc/passwd")}`);
    expect(file.status).toBe(400);
  });
});
