'use strict';

const { normalizeInput, extractDomains } = require('./normalize');

/**
 * Helpers
 */
function dedupeStrings(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map(v => (typeof v === 'string' ? v.trim() : ''))
        .filter(Boolean)
    )
  );
}

function numberValue(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildHit(base = {}) {
  return {
    type: base.type || 'signal',
    category: base.category || 'unknown',
    label: base.label || base.value || 'Signal',
    value: base.value || '',
    weight: numberValue(base.weight, 0),
    reason: base.reason || '',
    whatNotToDo: Array.isArray(base.whatNotToDo) ? base.whatNotToDo : [],
    absolute: Boolean(base.absolute),
    band: base.band || '',
    context: base.context || ''
  };
}

/**
 * DOMAIN: Known bad domains
 */
function findKnownBadDomainHit(raw, intel = {}) {
  const domains = extractDomains(raw);
  const entries = Array.isArray(intel.knownBadDomains)
    ? intel.knownBadDomains
    : [];

  for (const domain of domains) {
    const candidate = String(domain).toLowerCase();

    for (const entry of entries) {
      const value = String(entry?.value || entry).toLowerCase();
      if (!value) continue;

      if (candidate === value || candidate.endsWith(`.${value}`)) {
        return {
          hit: true,
          value,
          weight: numberValue(entry?.weight, 100),
          reason:
            entry?.reason || `Known bad domain detected: ${value}`,
          match: buildHit({
            type: 'known_bad_domain',
            category: entry?.category || 'known_bad_domain',
            value,
            weight: numberValue(entry?.weight, 100),
            reason:
              entry?.reason ||
              `Known bad domain detected: ${value}`,
            absolute: true,
            band: 'CRITICAL',
            context: candidate
          })
        };
      }
    }
  }

  return {
    hit: false,
    value: null,
    weight: 0,
    reason: '',
    match: null
  };
}

/**
 * DOMAIN KEYWORDS
 */
function scoreDomainKeywords(raw, intel = {}) {
  const domains = extractDomains(raw);
  const entries = Array.isArray(intel.scamDomainKeywords)
    ? intel.scamDomainKeywords
    : [];

  let score = 0;
  let urgencyScore = 0;
  const reasons = [];
  const hits = [];

  for (const domain of domains) {
    const candidate = String(domain).toLowerCase();

    for (const entry of entries) {
      const token = String(entry?.value || entry).toLowerCase();
      if (!token || !candidate.includes(token)) continue;

      const weight = numberValue(entry?.weight, 0);

      const hit = buildHit({
        type: 'domain_keyword',
        category: entry?.category || 'domain_keyword',
        value: token,
        weight,
        reason:
          entry?.reason ||
          `Domain keyword "${token}" matched`,
        context: candidate
      });

      hits.push(hit);
      reasons.push(hit.reason);

      if (hit.category === 'urgency') {
        urgencyScore += weight;
      } else {
        score += weight;
      }
    }
  }

  return {
    score: Math.min(score, 80),
    urgencyScore: Math.min(urgencyScore, 80),
    reasons: dedupeStrings(reasons),
    hits
  };
}

/**
 * TEXT PATTERNS (OCR SAFE)
 */
function scoreTextPatterns(raw, intel = {}) {
  const text = normalizeInput(raw);
  const patterns = Array.isArray(intel.scamPatterns)
    ? intel.scamPatterns
    : [];

  let score = 0;
  const reasons = [];
  const hits = [];
  let absoluteHit = null;

  for (const entry of patterns) {
    const source = String(entry?.pattern || entry?.value || '')
      .toLowerCase()
      .trim();

    if (!source) continue;

    // 🔥 OCR-safe matching: no regex, no strict phrase
    const matched = text.includes(source);

    if (!matched) continue;

    const weight = numberValue(entry?.weight, 0);

    const hit = buildHit({
      type: 'pattern',
      category: entry?.category || 'unknown',
      value: source,
      weight,
      reason:
        entry?.reason ||
        `Matched pattern: ${source}`,
      absolute:
        entry?.absolute ||
        entry?.category === 'credentials',
      context: text.slice(0, 200)
    });

    hits.push(hit);
    reasons.push(hit.reason);
    score += weight;

    if (hit.absolute && !absoluteHit) {
      absoluteHit = {
        hit: true,
        reason: hit.reason,
        value: source,
        match: hit
      };
    }
  }

  return {
    score: Math.min(score, 90),
    reasons: dedupeStrings(reasons),
    hits,
    absoluteHit
  };
}

/**
 * FINAL COLLECTOR
 */
function collectEvidence(raw, intel = {}) {
  const knownBadDomain = findKnownBadDomainHit(raw, intel);
  const domainKeywords = scoreDomainKeywords(raw, intel);
  const textPatterns = scoreTextPatterns(raw, intel);

  return {
    absolute: textPatterns.absoluteHit,
    knownBadDomain,
    textScore: textPatterns.score,
    domainScore: domainKeywords.score,
    urgencyScore: domainKeywords.urgencyScore,
    reasons: dedupeStrings([
      ...(knownBadDomain.reason ? [knownBadDomain.reason] : []),
      ...domainKeywords.reasons,
      ...textPatterns.reasons
    ]),
    hits: [
      ...(knownBadDomain.match ? [knownBadDomain.match] : []),
      ...domainKeywords.hits,
      ...textPatterns.hits
    ]
  };
}

module.exports = {
  collectEvidence,
  findKnownBadDomainHit,
  scoreDomainKeywords,
  scoreTextPatterns
};