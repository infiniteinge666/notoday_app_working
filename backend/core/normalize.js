"use strict";

/**
 * NoToday - normalize.js
 * Deterministic text normalization for multilingual scam detection.
 *
 * Goals:
 * - Preserve letters and numbers from ALL languages
 * - Remove markup / noise / dangerous invisibles
 * - Keep URLs and numbers readable for downstream detection
 * - Stay deterministic and dependency-free
 */

function coerceToString(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return String(value);
}

function stripHtml(text) {
  return text.replace(/<[^>]*>/g, " ");
}

function decodeBasicHtmlEntities(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function normalizeUnicode(text) {
  try {
    return text.normalize("NFKC");
  } catch {
    return text;
  }
}

function removeInvisibleControls(text) {
  return text
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ");
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeQuotesAndDashes(text) {
  return text
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[‐-‒–—―]/g, "-");
}

function preserveUsefulPunctuation(text) {
  /**
   * Keep:
   * - letters/numbers from all languages
   * - whitespace
   * - URL / money / ratio punctuation
   */
  return text.replace(/[^\p{L}\p{N}\s:/?&=._%#+@,\-]/gu, " ");
}

function normalizeInput(input) {
  let text = coerceToString(input);

  text = stripHtml(text);
  text = decodeBasicHtmlEntities(text);
  text = normalizeUnicode(text);
  text = removeInvisibleControls(text);
  text = normalizeQuotesAndDashes(text);
  text = preserveUsefulPunctuation(text);
  text = text.toLowerCase();
  text = normalizeWhitespace(text);

  return text;
}

function tokenizeInput(input) {
  const normalized = normalizeInput(input);
  if (!normalized) return [];

  return normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function extractNumbers(input) {
  const normalized = normalizeInput(input);
  if (!normalized) return [];

  const matches = normalized.match(/\d+(?:[.,]\d+)?/g);
  if (!matches) return [];

  const numbers = [];
  for (const match of matches) {
    const numeric = Number(match.replace(/,/g, ""));
    if (Number.isFinite(numeric)) {
      numbers.push(numeric);
    }
  }

  return numbers;
}

function extractUrls(input) {
  const raw = coerceToString(input);
  const normalized = normalizeInput(raw);

  const regex = /\b((?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?)/gi;
  const matches = normalized.match(regex);

  return matches ? Array.from(new Set(matches)) : [];
}

function extractDomains(input) {
  const urls = extractUrls(input);
  const domains = new Set();

  for (const url of urls) {
    let domain = url.trim().toLowerCase();

    domain = domain.replace(/^https?:\/\//, "");
    domain = domain.replace(/^www\./, "");
    domain = domain.split("/")[0];
    domain = domain.split("?")[0];
    domain = domain.split("#")[0];
    domain = domain.replace(/:\d+$/, "");

    if (domain) domains.add(domain);
  }

  return Array.from(domains);
}

module.exports = {
  normalizeInput,
  tokenizeInput,
  extractNumbers,
  extractUrls,
  extractDomains,
};