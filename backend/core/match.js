'use strict';

const { normalizeText, extractDomainCandidates } = require('./normalize');

// Deterministic pattern match:
// - If a pattern looks like a regex (contains common regex meta / escapes), use RegExp.test()
// - Otherwise, use a plain substring contains match.
// This fixes the current intel reality where many scamPatterns are stored as regex strings.
function looksLikeRegex(s) {
  if (!s) return false;
  // common regex markers used in our intel
  return /\\[bdsw]|[\(\)\|\[\]\?\+\*\^\$]/.test(s);
}

// Return: { hit, value }
function findKnownBadDomainHit(raw, intel) {
  const domains = extractDomainCandidates(raw);
  const list = (intel.knownBadDomains || []).map(x => String(x.value || x || '').toLowerCase());

  console.log('[match] knownBad:start', {
    candidateDomainsCount: domains.length,
    knownBadDomainsCount: list.length
  });

  for (const d of domains) {
    const dn = String(d || '').toLowerCase();
    if (list.includes(dn)) {
      console.log('[match] knownBad:hit', {
        value: dn
      });

      return { hit: true, value: dn };
    }
  }

  console.log('[match] knownBad:end', {
    hit: false
  });

  return { hit: false, value: null };
}

// Return: { score, reasons, hits }
function scoreDomainKeywords(raw, intel) {
  const domains = extractDomainCandidates(raw);
  const kw = intel.scamDomainKeywords || [];

  console.log('[match] domainKeywords:start', {
    candidateDomainsCount: domains.length,
    keywordCount: kw.length
  });

  let score = 0;
  const reasons = [];
  const hits = [];

  for (const d of domains) {
    const dn = String(d || '').toLowerCase();

    for (const k of kw) {
      const token = String(k.value || '').toLowerCase();
      if (!token) continue;

      if (dn.includes(token)) {
        const w = Number(k.weight || 0);
        if (w <= 0) continue;

        score += w;
        const msg = `Domain keyword "${token}" matched in "${dn}" (+${w})`;
        reasons.push(msg);
        hits.push({ type: 'domain_keyword', category: k.category || 'domain_keyword', value: token, weight: w, context: dn });
      }
    }
  }

  // conservative clamp
  score = Math.min(score, 80);

  console.log('[match] domainKeywords:end', {
    hitCount: hits.length,
    score,
    categories: hits.map(hit => hit.category)
  });

  return { score, reasons, hits };
}

// Return: { score, reasons, hits, absoluteTriggered }
function scoreTextPatterns(raw, intel) {
  const text = normalizeText(raw);
  const patterns = intel.scamPatterns || [];

  console.log('[match] textPatterns:start', {
    normalizedTextLength: text.length,
    patternCount: patterns.length
  });

  let score = 0;
  const reasons = [];
  const hits = [];
  let absoluteTriggered = false;

  for (const p of patterns) {
    const patternRaw = String(p.value || '');
    if (!patternRaw) continue;

    const w = Number(p.weight || 0);
    const cat = String(p.category || 'unknown');

    let matched = false;

    if (looksLikeRegex(patternRaw)) {
      // Regex path (deterministic). Guard against invalid regex strings.
      try {
        const re = new RegExp(patternRaw, 'i');
        matched = re.test(text);
      } catch (e) {
        console.error('[match] textPatterns:regex_error', {
          category: cat,
          pattern: patternRaw,
          message: e?.message || 'Invalid regex'
        });

        // Fall back to literal contains on a de-escaped version (best-effort, still deterministic).
        const literal = patternRaw
          .replace(/\\b/g, '')
          .replace(/\\s\+/g, ' ')
          .replace(/\\s\*/g, ' ')
          .replace(/\\s/g, ' ')
          .toLowerCase();
        matched = text.includes(literal.trim());
      }
    } else {
      // Plain contains path
      matched = text.includes(patternRaw.toLowerCase());
    }

    if (!matched) continue;

    // Absolute credential gate:
    // - category "credentials" is absolute by policy
    // - also treat "credential_request" as absolute (same meaning, avoids category drift)
    if (cat === 'credentials' || cat === 'credential_request') absoluteTriggered = true;

    if (w > 0) score += w;

    const msg = `Matched "${patternRaw}" [${cat}] (+${w})`;
    reasons.push(msg);
    hits.push({ type: 'pattern', category: cat, value: patternRaw, weight: w });

    console.log('[match] textPatterns:hit', {
      category: cat,
      weight: w
    });
  }

  // conservative clamp (absolute handled elsewhere)
  score = Math.min(score, 90);

  console.log('[match] textPatterns:end', {
    matchCount: hits.length,
    score,
    absoluteTriggered
  });

  return { score, reasons, hits, absoluteTriggered };
}

module.exports = {
  findKnownBadDomainHit,
  scoreDomainKeywords,
  scoreTextPatterns
};