"use strict";

/**
 * NoToday - match.js (FIXED)
 * Deterministic matching with proper regex execution.
 *
 * FIXES:
 * - Replaces .includes() with RegExp.test()
 * - Adds safe regex fallback
 * - Preserves deterministic scoring
 */

const {
  normalizeInput,
  tokenizeInput,
  extractNumbers,
  extractDomains,
} = require("./normalize");

const DEFAULT_REASON_MAP = {
  known_bad_domain: "This message links to a known scam domain.",
  suspicious_domain_keyword: "The link contains scam-like domain wording.",
  suspicious_text_pattern: "The wording matches known scam behaviour.",
  free_money: "This message promises unrealistic returns or free money.",
  urgency: "The message creates time pressure to stop you verifying.",
  credential_request: "The message asks for sensitive financial or login information.",
  private_account_payment: "The message suggests payment to a personal account.",
};

// =========================
// HELPERS
// =========================

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toPatternObjects(list, defaultWeight = 25, defaultCategory = "generic") {
  return asArray(list)
    .map((entry) => {
      if (typeof entry === "string") {
        return {
          value: normalizeInput(entry),
          weight: defaultWeight,
          category: defaultCategory,
        };
      }

      if (entry && typeof entry === "object" && entry.value) {
        return {
          value: entry.value, // DO NOT normalize regex patterns
          weight: Number(entry.weight) || defaultWeight,
          category: entry.category || defaultCategory,
        };
      }

      return null;
    })
    .filter(Boolean);
}

// SAFE REGEX EXECUTION
function safeMatch(text, pattern) {
  try {
    const regex = new RegExp(pattern, "i");
    return regex.test(text);
  } catch (e) {
    // fallback to simple includes if regex breaks
    return text.includes(pattern.toLowerCase());
  }
}

// =========================
// DOMAIN CHECK
// =========================

function findKnownBadDomainHit(text, intel = {}) {
  const domains = extractDomains(text);
  const knownBadDomains = asArray(intel.knownBadDomains);

  for (const domain of domains) {
    for (const bad of knownBadDomains) {
      if (
        domain === bad ||
        domain.endsWith(`.${bad}`) ||
        domain.includes(bad)
      ) {
        return {
          hit: true,
          domain,
          matched: bad,
          reason: DEFAULT_REASON_MAP.known_bad_domain,
          score: 100,
        };
      }
    }
  }

  return { hit: false, score: 0 };
}

// =========================
// DOMAIN KEYWORDS
// =========================

function scoreDomainKeywords(text, intel = {}) {
  const domains = extractDomains(text);
  const patterns = toPatternObjects(intel.scamDomainKeywords);

  let total = 0;
  const matches = [];

  for (const domain of domains) {
    for (const p of patterns) {
      if (domain.includes(p.value)) {
        total += p.weight;
        matches.push({
          value: p.value,
          weight: p.weight,
          category: "domain_keyword",
          reason: DEFAULT_REASON_MAP.suspicious_domain_keyword,
        });
      }
    }
  }

  return { score: Math.min(total, 90), matches };
}

// =========================
// TEXT PATTERNS (FIXED)
// =========================

function scoreTextPatterns(text, intel = {}) {
  const normalized = normalizeInput(text);
  const patterns = toPatternObjects(intel.scamPatterns);

  let total = 0;
  const matches = [];

  for (const p of patterns) {
    if (safeMatch(normalized, p.value)) {
      matches.push({
        value: p.value,
        weight: p.weight,
        category: p.category,
        reason:
          p.category === "credentials"
            ? DEFAULT_REASON_MAP.credential_request
            : DEFAULT_REASON_MAP.suspicious_text_pattern,
      });

      total += p.weight;
    }
  }

  return {
    score: Math.min(total, 95),
    matches,
  };
}

// =========================
// ABSOLUTE SIGNALS (FIXED)
// =========================

function checkAbsoluteTextSignals(text, intel = {}) {
  const normalized = normalizeInput(text);
  const patterns = toPatternObjects(intel.scamPatterns);

  for (const p of patterns) {
    if (
      (p.category === "credentials" || p.category === "absolute") &&
      safeMatch(normalized, p.value)
    ) {
      return {
        hit: true,
        category: p.category,
        reason: DEFAULT_REASON_MAP.credential_request,
        score: 100,
      };
    }
  }

  return { hit: false, score: 0 };
}

// =========================
// EXPORTS
// =========================

module.exports = {
  findKnownBadDomainHit,
  scoreDomainKeywords,
  scoreTextPatterns,
  checkAbsoluteTextSignals,
};