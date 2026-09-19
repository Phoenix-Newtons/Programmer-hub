import { useEffect } from "react";
import { SITE, absoluteUrl } from "../lib/site";

/**
 * Per-page SEO: title, description, canonical URL, Open Graph / Twitter tags
 * and optional JSON-LD structured data. Everything it creates is marked with
 * `data-page-meta` and removed on unmount, so the document never accumulates
 * stale tags when navigating a single-page app.
 */
export default function usePageMeta({ title, description, type = "website", image, jsonLd, noIndex } = {}) {
  useEffect(() => {
    const previousTitle = document.title;
    const fullTitle = title ? `${title} • ${SITE.name}` : `${SITE.name} — ${SITE.tagline}`;
    document.title = fullTitle;

    const created = [];

    const setTag = (selector, create) => {
      let node = document.head.querySelector(selector);
      if (node) {
        node.setAttribute("data-page-meta", "keep");
        return node;
      }
      node = create();
      node.setAttribute("data-page-meta", "true");
      document.head.appendChild(node);
      created.push(node);
      return node;
    };

    const desc = description || (title ? `${title} on ${SITE.name}. ${SITE.tagline}` : SITE.description);

    setTag('meta[name="description"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      return meta;
    }).setAttribute("content", desc);

    const canonicalHref = typeof window === "undefined" ? "" : absoluteUrl(window.location.pathname);
    if (canonicalHref) {
      setTag('link[rel="canonical"]', () => {
        const link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        return link;
      }).setAttribute("href", canonicalHref);
    }

    const social = [
      ["og:title", fullTitle],
      ["og:description", desc],
      ["og:type", type],
      ["og:site_name", SITE.name],
      ["og:locale", SITE.locale],
      ["twitter:card", image ? "summary_large_image" : "summary"],
      ["twitter:title", fullTitle],
      ["twitter:description", desc],
    ];
    if (image) social.push(["og:image", image], ["twitter:image", image]);
    if (canonicalHref) social.push(["og:url", canonicalHref]);
    if (noIndex) social.push(["robots", "noindex, nofollow"]);

    social.forEach(([property, content]) => {
      const isTw = property.startsWith("twitter:");
      const selector = isTw ? `meta[name="${property}"]` : `meta[property="${property}"]`;
      setTag(selector, () => {
        const meta = document.createElement("meta");
        if (isTw) meta.setAttribute("name", property);
        else meta.setAttribute("property", property);
        return meta;
      }).setAttribute("content", String(content));
    });

    let jsonLdNode;
    if (jsonLd) {
      jsonLdNode = document.createElement("script");
      jsonLdNode.type = "application/ld+json";
      jsonLdNode.setAttribute("data-page-meta", "true");
      jsonLdNode.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(jsonLdNode);
      created.push(jsonLdNode);
    }

    const keep = [...document.head.querySelectorAll('[data-page-meta="keep"]')];
    return () => {
      created.forEach((node) => node.remove());
      keep.forEach((node) => node.removeAttribute("data-page-meta"));
      document.title = previousTitle;
    };
  }, [title, description, type, image, noIndex, JSON.stringify(jsonLd)]); // eslint-disable-line react-hooks/exhaustive-deps
}
