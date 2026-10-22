import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  buildPreviewResult,
  extractMetadata,
  fallbackScreenshotUrl,
  isChallengePage,
} from "../../../server/preview-core.mjs";
import {
  buildServerlessLaunchOptions,
  createScreenshotService,
  desktopUserAgent,
  isServerlessEnvironment,
} from "../../../server/screenshot-service.mjs";
import { createProxyApp } from "../../../server/preview-proxy.mjs";

describe("preview core", () => {
  it("extracts title and OpenGraph metadata, resolving relative images", () => {
    const html = `<html><head>
      <title>Fallback title</title>
      <meta property="og:title" content="OG &amp; Title">
      <meta name="description" content="A neat site">
      <meta property="og:image" content="/cover.png">
      <meta property="og:site_name" content="Neat">
    </head></html>`;
    const metadata = extractMetadata(html, "https://example.com/blog/post");
    expect(metadata.title).toBe("OG & Title");
    expect(metadata.description).toBe("A neat site");
    expect(metadata.image).toBe("https://example.com/cover.png");
    expect(metadata.siteName).toBe("Neat");
  });

  it("detects Cloudflare challenge interstitials", () => {
    expect(isChallengePage({ title: "Just a moment...", html: "<div>checking</div>" })).toBe(true);
    expect(isChallengePage({ title: "Real page", html: "<h1>Hello</h1>" })).toBe(false);
  });

  it("shapes challenge results with a fallback image, never a fake capture", () => {
    const result = buildPreviewResult({ url: "https://example.com", challenge: true });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("CHALLENGE_DETECTED");
    expect(result.screenshotBase64).toBeUndefined();
    expect(result.screenshotUrl).toBe(fallbackScreenshotUrl("https://example.com"));
  });
});

function fakeBrowser({ html, title = "Real Page", failGoto = false } = {}) {
  const page = {
    closed: false,
    setViewport: vi.fn(async () => {}),
    setExtraHTTPHeaders: vi.fn(async () => {}),
    goto: vi.fn(async () => {
      if (failGoto) throw new Error("net::ERR_TIMEOUT");
      return { status: () => 200 };
    }),
    title: vi.fn(async () => title),
    content: vi.fn(async () => html),
    url: vi.fn(() => "https://example.com/"),
    evaluate: vi.fn(async () => ({
      title,
      description: "From evaluate",
      image: "",
      siteName: "",
      type: "",
      themeColor: "",
    })),
    screenshot: vi.fn(async () => Buffer.from("PNGDATA")),
    close: vi.fn(async () => {
      page.closed = true;
    }),
  };
  return {
    page,
    newPage: vi.fn(async () => page),
    close: vi.fn(async () => {}),
    isConnected: () => true,
  };
}

const GATE = { gateConfig: { allowedHosts: [], allowPrivate: true } };

describe("screenshot service lifecycle", () => {
  it("captures a base64 screenshot and always closes the page", async () => {
    const browser = fakeBrowser({ html: "<html><head><title>Real Page</title></head></html>" });
    const service = createScreenshotService({ launchBrowser: async () => browser });
    const result = await service.capturePreview(new URL("https://example.com/"), GATE);
    expect(result.ok).toBe(true);
    expect(result.title).toBe("Real Page");
    expect(result.screenshotBase64).toBe(Buffer.from("PNGDATA").toString("base64"));
    expect(browser.page.close).toHaveBeenCalled();
    expect(browser.close).toHaveBeenCalled(); // injected/per-request mode
  });

  it("closes the page even when navigation explodes (no zombie pages)", async () => {
    const browser = fakeBrowser({ html: "", failGoto: true });
    const service = createScreenshotService({ launchBrowser: async () => browser });
    await expect(service.capturePreview(new URL("https://example.com/"), GATE)).rejects.toThrow();
    expect(browser.page.close).toHaveBeenCalled();
  });

  it("reports a challenge instead of screenshotting the interstitial", async () => {
    const browser = fakeBrowser({
      html: "<html><title>Just a moment...</title><body>Checking your browser</body></html>",
      title: "Just a moment...",
    });
    const service = createScreenshotService({ launchBrowser: async () => browser });
    const result = await service.capturePreview(new URL("https://example.com/"), GATE);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("CHALLENGE_DETECTED");
    expect(browser.page.screenshot).not.toHaveBeenCalled();
  });
});

describe("serverless chromium resolution", () => {
  it("detects serverless runtimes from the environment", () => {
    expect(isServerlessEnvironment({ VERCEL: "1" })).toBe(true);
    expect(isServerlessEnvironment({ AWS_LAMBDA_FUNCTION_NAME: "fn" })).toBe(true);
    expect(isServerlessEnvironment({})).toBe(false);
  });

  it("builds launch options with chromium.args, no-sandbox flags and a 1280x720 viewport", () => {
    const options = buildServerlessLaunchOptions("/tmp/chromium", {
      args: ["--disable-dev-shm-usage"],
      headless: "shell",
    });
    expect(options.executablePath).toBe("/tmp/chromium");
    expect(options.args).toContain("--disable-dev-shm-usage");
    expect(options.args).toContain("--no-sandbox");
    expect(options.args).toContain("--disable-setuid-sandbox");
    expect(options.defaultViewport).toEqual({ width: 1280, height: 720, deviceScaleFactor: 1 });
    expect(options.headless).toBe("shell");
  });

  it("aligns the desktop UA to the running Chromium version", () => {
    expect(desktopUserAgent("HeadlessChrome/131.0.6778.204")).toContain("Chrome/131.0.0.0");
    expect(desktopUserAgent("")).toContain("Windows NT 10.0");
  });
});

describe("/api/preview endpoint", () => {
  let server;
  let base;

  beforeAll(async () => {
    const screenshotService = {
      capturePreview: vi.fn(async (url) =>
        url.hostname.includes("blocked")
          ? buildPreviewResult({ url: url.href, challenge: true })
          : buildPreviewResult({
              url: url.href,
              metadata: { title: "Demo" },
              screenshotBase64: "QUJD",
            })
      ),
      closeBrowser: async () => {},
    };
    const app = createProxyApp({
      serveDemo: false,
      screenshotService,
      fetchFn: async () => new Response("<html></html>", { headers: { "content-type": "text/html" } }),
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

  it("returns title, metadata and a base64 screenshot as JSON", async () => {
    const response = await fetch(`${base}/api/preview?url=${encodeURIComponent("https://example.com")}`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.title).toBe("Demo");
    expect(data.screenshotBase64).toBe("QUJD");
    expect(data.mimeType).toBe("image/png");
  });

  it("maps challenge pages to 409 with a fallback image", async () => {
    const response = await fetch(
      `${base}/api/preview?url=${encodeURIComponent("https://blocked.example.com")}`
    );
    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.code).toBe("CHALLENGE_DETECTED");
    expect(data.screenshotUrl).toContain("mshots");
  });

  it("rejects unsafe URLs with 400", async () => {
    const response = await fetch(`${base}/api/preview?url=${encodeURIComponent("file:///etc/passwd")}`);
    expect(response.status).toBe(400);
  });
});

describe("Vercel function handler (api/preview.mjs)", () => {
  function mockRes() {
    return {
      statusCode: null,
      body: null,
      headers: {},
      setHeader(key, value) {
        this.headers[key] = value;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
  }

  it("rejects non-GET and missing/invalid URLs without launching a browser", async () => {
    const handler = (await import("../../../api/preview.mjs")).default;

    const post = mockRes();
    await handler({ method: "POST", url: "/api/preview", query: {} }, post);
    expect(post.statusCode).toBe(405);

    const missing = mockRes();
    await handler({ method: "GET", url: "/api/preview", query: {} }, missing);
    expect(missing.statusCode).toBe(400);

    const unsafe = mockRes();
    await handler({ method: "GET", url: "/api/preview", query: { url: "file:///etc/passwd" } }, unsafe);
    expect(unsafe.statusCode).toBe(400);
  });
});
