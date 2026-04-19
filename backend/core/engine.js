'use strict';

const { collectEvidence } = require('./match');
const { scoreEvidence } = require('./score');
const { buildExplanation } = require('./explain');

function runCheck(raw, intel = {}) {
  const text = String(raw?.text || raw || '').trim();

  const evidence = collectEvidence(text, intel);
  const scoring = scoreEvidence(evidence);
  const explanation = buildExplanation(scoring, evidence, intel);

  return {
    ...scoring,
    ...explanation,
    hits: evidence.hits,
    matchedCount: Array.isArray(evidence.hits) ? evidence.hits.length : 0
  };
}

module.exports = {
  runCheck,
  scan: runCheck
};
