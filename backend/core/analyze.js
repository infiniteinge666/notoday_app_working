'use strict';

const { normalizeRaw } = require('./normalize');
const { collectEvidence } = require('./match');
const { scoreEvidence } = require('./score');
const { buildExplanation } = require('./explain');

function analyze(input, intel = {}) {
  const normalized = normalizeRaw(input);
  const evidence = collectEvidence(normalized, intel);
  const scoring = scoreEvidence(evidence);
  const explanation = buildExplanation(scoring, evidence, intel);

  return {
    normalized,
    evidence,
    ...scoring,
    ...explanation
  };
}

module.exports = { analyze };