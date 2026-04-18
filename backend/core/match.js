'use strict';

const { normalizeInput, extractDomains } = require('./normalize');

function dedupeStrings(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean)
    )
  );
}

function numberValue(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function looksLikeRegex(pattern) {
  if (!pattern) return false;
  return /\\[bdsw]|[\(\)\|\[\]\?\+\*\^\$]/.test(pattern);
}

function sanitizeFlags(flags) {
  const safeFlags = String(flags || 'i').replace(/[^dgimsuy]/g, '');
  return safeFlags || 'i';
}

function buildHit(base = {}) {
  return {
    type: base.type || 'signal',
    category: base.category || 'unknown',
    label: base.label || base.reason || base.value || 'Intel signal',
    value: base.value || '',
    weight: numberValue(base.weight, 0),
    reason: base.reason || '',
    whatNotToDo: Array.isArray(base.whatNotToDo) ? base.whatNotToDo.filter(Boolean) : [],
    absolute: Boolean(base.absolute),
    band: base.band || '',
    context: base.context || ''
  };
}

function findKnownBadDomainHit(raw, intel = {}) {
  const domains = extractDomains(raw);
  const entries = Array.isArray(intel.knownBadDomains) ? intel.knownBadDomains : [];

  for (const domain of domains) {
    const candidate = String(domain || '').toLowerCase();

    for (const entry of entries) {
      const value = String(entry?.value || entry || '').toLowerCase();
      if (!value) continue;

      if (candidate === value || candidate.endsWith(`.${value}`)) {
        return {
          hit: true,
          value,
          weight: numberValue(entry?.weight, 100),
          reason: entry?.reason || `Known bad domain detected: ${value}.`,
          match: buildHit({
            type: 'known_bad_domain',
            category: entry?.category || 'known_bad_domain',
            label: entry?.label || 'Known bad domain',
            value,
            weight: numberValue(entry?.weight, 100),
            reason: entry?.reason || `Known bad domain detected: ${value}.`,
            whatNotToDo: entry?.whatNotToDo,
            absolute: true,
            band: entry?.band || 'CRITICAL',
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

function scoreDomainKeywords(raw, intel = {}) {
  const domains = extractDomains(raw);
  const entries = Array.isArray(intel.scamDomainKeywords) ? intel.scamDomainKeywords : [];

  let score = 0;
  let urgencyScore = 0;
  const reasons = [];
  const hits = [];

  for (const domain of domains) {
    const candidate = String(domain || '').toLowerCase();

    for (const entry of entries) {
      const token = String(entry?.value || entry || '').toLowerCase();
      if (!token || !candidate.includes(token)) continue;

      const weight = numberValue(entry?.weight, 0);
      const reason = entry?.reason || `Domain keyword "${token}" matched in "${candidate}".`;
      const hit = buildHit({
        type: 'domain_keyword',
        category: entry?.category || 'domain_keyword',
        label: entry?.label || `Domain keyword: ${token}`,
        value: token,
        weight,
        reason,
        whatNotToDo: entry?.whatNotToDo,
        absolute: Boolean(entry?.absolute),
        band: entry?.band,
        context: candidate
      });

      hits.push(hit);
      reasons.push(reason);

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

function scoreTextPatterns(raw, intel = {}) {
  const text = normalizeInput(raw);
  const patterns = Array.isArray(intel.scamPatterns) ? intel.scamPatterns : [];

  let score = 0;
  const reasons = [];
  const hits = [];
  let absoluteHit = null;

  for (const entry of patterns) {
    const patternSource = String(entry?.pattern || entry?.value || '');
    if (!patternSource) continue;

    let matched = false;

    if (looksLikeRegex(patternSource)) {
      try {
        const re = new RegExp(patternSource, sanitizeFlags(entry?.flags));
        matched = re.test(text);
      } catch (error) {
        const fallbackLiteral = patternSource
          .replace(/\\b/g, '')
          .replace(/\\s\+/g, ' ')
          .replace(/\\s\*/g, ' ')
          .replace(/\\s/g, ' ')
          .toLowerCase()
          .trim();

        matched = fallbackLiteral ? text.includes(fallbackLiteral) : false;
      }
    } else {
      matched = text.includes(patternSource.toLowerCase());
    }

    if (!matched) continue;

    const weight = numberValue(entry?.weight, 0);
    const reason = entry?.reason || `Matched pattern: ${patternSource}.`;
    const category = String(entry?.category || 'unknown');
    const absolute =
      Boolean(entry?.absolute) ||
      category === 'credentials' ||
      category === 'credential_request';

    const hit = buildHit({
      type: 'pattern',
      category,
      label: entry?.label || category || 'Pattern hit',
      value: patternSource,
      weight,
      reason,
      whatNotToDo: entry?.whatNotToDo,
      absolute,
      band: entry?.band,
      context: text.slice(0, 300)
    });

    hits.push(hit);
    reasons.push(reason);
    score += weight;

    if (absolute && !absoluteHit) {
      absoluteHit = {
        hit: true,
        reason,
        value: patternSource,
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

function collectEvidence(raw, intel = {}) {
  const knownBadDomain = findKnownBadDomainHit(raw, intel);
  const domainKeywords = scoreDomainKeywords(raw, intel);
  const textPatterns = scoreTextPatterns(raw, intel);
  const hits = [
    ...(knownBadDomain.match ? [knownBadDomain.match] : []),
    ...domainKeywords.hits,
    ...textPatterns.hits
  ];

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
    hits
  };
}

module.exports = {
  collectEvidence,
  findKnownBadDomainHit,
  scoreDomainKeywords,
  scoreTextPatterns
};
