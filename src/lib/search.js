/**
 * Tiny dependency-free fuzzy search used by the directory pages and the
 * command palette.
 *
 * Scoring is intentionally simple and predictable:
 *   • exact field match        → 1000
 *   • word-boundary prefix     → 120 per token
 *   • plain substring          → 60 per token
 *   • initials / skips         → 24 per token (so "fzzy" finds "fuzzy")
 * Every query token must land somewhere, otherwise the item is rejected —
 * that keeps results precise instead of noisy.
 */

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#./@\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(query) {
  return normalizeText(query).split(" ").filter(Boolean);
}

/** Do the characters of `needle` appear in order inside `haystack`? */
export function isSubsequence(needle, haystack) {
  let cursor = 0;
  for (let i = 0; i < haystack.length && cursor < needle.length; i += 1) {
    if (haystack[i] === needle[cursor]) cursor += 1;
  }
  return cursor === needle.length;
}

/** Score a single token against a single (already normalised) haystack. */
export function scoreToken(token, haystack) {
  if (!token || !haystack) return 0;

  const index = haystack.indexOf(token);
  if (index !== -1) {
    const atWordStart = index === 0 || /[\s\-./@]/.test(haystack[index - 1]);
    // Earlier matches score slightly higher than late ones.
    const positionBonus = Math.max(0, 10 - Math.floor(index / 8));
    if (atWordStart) return 120 + positionBonus;
    return 60 + positionBonus;
  }

  // Initials: "rn" matches "React Native", "la" matches "Luwangula Alpha".
  const words = haystack.split(/[\s\-./@]+/).filter(Boolean);
  const letters = words.map((word) => word[0]).join("");
  if (token.length <= 4 && letters.includes(token)) return 42;

  if (token.length >= 3 && isSubsequence(token, haystack)) return 24;

  return 0;
}

/**
 * Scores one item against a query.
 *
 * @param {object} options
 * @param {string}   options.query   Raw user query.
 * @param {object}   options.fields  `{ key: value }` — arrays join without commas.
 * @param {object}   [options.weights] Optional per-field multiplier (default 1).
 * @returns {number} 0 when the item does not match every query token.
 */
export function scoreItem({ query, fields = {}, weights = {} }) {
  const tokens = tokenize(query);
  if (!tokens.length) return 1; // empty query = "everything matches"

  const haystacks = Object.entries(fields).map(([key, value]) => ({
    weight: weights[key] ?? 1,
    text: normalizeText(Array.isArray(value) ? value.join(" ") : value),
  }));

  let total = 0;

  for (const token of tokens) {
    let best = 0;
    for (const field of haystacks) {
      // Exact field match (e.g. skill === "react") beats everything else.
      if (field.text === token) {
        best = Math.max(best, 1000 * field.weight);
        continue;
      }
      const scored = scoreToken(token, field.text);
      if (scored) best = Math.max(best, scored * field.weight);
    }
    if (!best) return 0; // token unmatched → reject the item
    total += best;
  }

  return Math.round(total);
}

/**
 * Filters + ranks a list.
 *
 * @returns {Array<{ item: any, score: number }>} matching items, best first.
 */
export function rankItems(items, query, { fields, weights, limit } = {}) {
  const resolve = fields || (() => ({}));
  const scored = [];

  for (const item of items || []) {
    const score = scoreItem({ query, fields: resolve(item), weights });
    if (score > 0) scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return typeof limit === "number" ? scored.slice(0, limit) : scored;
}

/**
 * Splits text into `{ text, match }` chunks so the palette can bold the parts
 * the user typed. Case-insensitive, ignores punctuation differences.
 */
export function highlight(text, query) {
  const source = String(text ?? "");
  const tokens = tokenize(query).filter((token) => token.length > 1);
  if (!tokens.length) return [{ text: source, match: false }];

  const flags = new Array(source.length).fill(false);
  const lower = normalizeText(source);

  for (const token of tokens) {
    let from = 0;
    for (;;) {
      const index = lower.indexOf(token, from);
      if (index === -1) break;
      for (let i = index; i < index + token.length; i += 1) flags[i] = true;
      from = index + token.length;
    }
  }

  const chunks = [];
  for (let i = 0; i < source.length; i += 1) {
    const last = chunks[chunks.length - 1];
    if (last && last.match === flags[i]) last.text += source[i];
    else chunks.push({ text: source[i], match: flags[i] });
  }
  return chunks.length ? chunks : [{ text: source, match: false }];
}
