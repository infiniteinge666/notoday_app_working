'use strict';

const { normalizeInput } = require('./normalize');
const { collectEvidence } = require('./match');
const { scoreEvidence } = require('./score');
const { buildExplanation } = require('./explain');

function analyze(input, intel = {}) {
  const normalized = normalizeInput(input);
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
