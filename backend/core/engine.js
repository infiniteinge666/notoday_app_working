'use strict';

const { scoreEvidence } = require('./score');
const { buildExplanation } = require('./explain');
const { findKnownBadDomainHit, scoreDomainKeywords, scoreTextPatterns } = require('./match');

function runCheck(raw, intel) {
  const text = String(raw || '');

  console.log('[engine] runCheck:start', {
    textLength: text.length,
    intelVersion: intel?.version || 'unknown',
    knownBadDomainsCount: Array.isArray(intel?.knownBadDomains) ? intel.knownBadDomains.length : 0,
    scamDomainKeywordsCount: Array.isArray(intel?.scamDomainKeywords) ? intel.scamDomainKeywords.length : 0,
    scamPatternsCount: Array.isArray(intel?.scamPatterns) ? intel.scamPatterns.length : 0
  });

  const evidence = {
    knownBad: findKnownBadDomainHit(text, intel),
    domainKeywords: scoreDomainKeywords(text, intel),
    textPatterns: scoreTextPatterns(text, intel)
  };

  console.log('[engine] evidence:built', {
    knownBadHit: !!evidence?.knownBad?.hit,
    knownBadValue: evidence?.knownBad?.value || null,
    domainKeywordScore: evidence?.domainKeywords?.score || 0,
    domainKeywordHits: Array.isArray(evidence?.domainKeywords?.hits) ? evidence.domainKeywords.hits.length : 0,
    textPatternScore: evidence?.textPatterns?.score || 0,
    textPatternHits: Array.isArray(evidence?.textPatterns?.hits) ? evidence.textPatterns.hits.length : 0,
    absoluteTriggered: !!evidence?.textPatterns?.absoluteTriggered
  });

  console.log('[engine] scoring:start');

  const scored = scoreEvidence(evidence);

  console.log('[engine] scoring:end', {
    score: scored?.score || 0,
    band: scored?.band || null,
    reasonsCount: Array.isArray(scored?.reasons) ? scored.reasons.length : 0
  });

  const explained = buildExplanation(scored, intel.version);

  console.log('[engine] runCheck:end', {
    finalScore: explained?.score || 0,
    finalBand: explained?.band || null,
    reasonsCount: Array.isArray(explained?.reasons) ? explained.reasons.length : 0
  });

  return explained;
}

module.exports = {
  runCheck,
  scan: runCheck
};