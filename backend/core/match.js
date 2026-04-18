'use strict';

const { normalizeInput, extractDomains } = require('./normalize');

/**
 * Helpers
 */
function dedupeStrings(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function num(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function hit(base = {}) {
  return {
    type: base.type || 'signal',
    category: base.category || 'unknown',
    value: base.value || '',
    weight: num(base.weight, 0),
    reason: base.reason || '',
    absolute: Boolean(base.absolute),
    context: base.context || ''
  };
}

/**
 * DOMAIN: Known bad domains
 */
function findKnownBadDomainHit(raw, intel = {}) {
  const domains = extractDomains(raw);
  const list = Array.isArray(intel.knownBadDomains) ? intel.knownBadDomains : [];

  for (const d of domains) {
    const domain = String(d).toLowerCase();

    for (const e of list) {
      const val = String(e?.value || e).toLowerCase();
      if (!val) continue;

      if (domain === val || domain.endsWith(`.${val}`)) {
        return {
          hit: true,
          value: val,
          weight: num(e?.weight, 100),
          reason: e?.reason || `Known bad domain: ${val}`,
          match: hit({
            type: 'known_bad_domain',
            category: e?.category || 'known_bad_domain',
            value: val,
            weight: num(e?.weight, 100),
            reason: e?.reason || `Known bad domain: ${val}`,
            absolute: true,
            context: domain
          })
        };
      }
    }
  }

  return { hit: false, value: null, weight: 0, reason: '', match: null };
}

/**
 * DOMAIN KEYWORDS
 */
function scoreDomainKeywords(raw, intel = {}) {
  const domains = extractDomains(raw);
  const list = Array.isArray(intel.scamDomainKeywords) ? intel.scamDomainKeywords : [];

  let score = 0;
  let urgency = 0;
  const reasons = [];
  const hits = [];

  for (const d of domains) {
    const domain = String(d).toLowerCase();

    for (const e of list) {
      const token = String(e?.value || e).toLowerCase();
      if (!token || !domain.includes(token)) continue;

      const w = num(e?.weight, 0);

      hits.push(hit({
        type: 'domain_keyword',
        category: e?.category || 'domain_keyword',
        value: token,
        weight: w,
        reason: e?.reason || `Domain keyword: ${token}`,
        context: domain
      }));

      reasons.push(e?.reason || `Domain keyword: ${token}`);

      if (e?.category === 'urgency') {
        urgency += w;
      } else {
        score += w;
      }
    }
  }

  return {
    score: Math.min(score, 80),
    urgencyScore: Math.min(urgency, 80),
    reasons: dedupeStrings(reasons),
    hits
  };
}

/**
 * TEXT PATTERNS (simple + OCR-safe)
 */
function scoreTextPatterns(raw, intel = {}) {
  const text = normalizeInput(raw);
  const list = Array.isArray(intel.scamPatterns) ? intel.scamPatterns : [];

  let score = 0;
  const reasons = [];
  const hits = [];
  let absoluteHit = null;

  for (const e of list) {
    const pattern = String(e?.pattern || e?.value || '').toLowerCase().trim();
    if (!pattern) continue;

    if (!text.includes(pattern)) continue;

    const w = num(e?.weight, 0);

    const h = hit({
      type: 'pattern',
      category: e?.category || 'unknown',
      value: pattern,
      weight: w,
      reason: e?.reason || `Matched: ${pattern}`,
      absolute: Boolean(e?.absolute),
      context: text.slice(0, 200)
    });

    hits.push(h);
    reasons.push(h.reason);
    score += w;

    if (h.absolute && !absoluteHit) {
      absoluteHit = { hit: true, reason: h.reason, value: pattern, match: h };
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
 * FINAL
 */
function collectEvidence(raw, intel = {}) {
  const known = findKnownBadDomainHit(raw, intel);
  const domains = scoreDomainKeywords(raw, intel);
  const text = scoreTextPatterns(raw, intel);

  return {
    absolute: text.absoluteHit,
    knownBadDomain: known,
    textScore: text.score,
    domainScore: domains.score,
    urgencyScore: domains.urgencyScore,
    reasons: dedupeStrings([
      ...(known.reason ? [known.reason] : []),
      ...domains.reasons,
      ...text.reasons
    ]),
    hits: [
      ...(known.match ? [known.match] : []),
      ...domains.hits,
      ...text.hits
    ]
  };
}

module.exports = {
  collectEvidence,
  findKnownBadDomainHit,
  scoreDomainKeywords,
  scoreTextPatterns
};