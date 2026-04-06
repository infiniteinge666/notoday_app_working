'use strict';

const { analyze } = require('./analyze');

function runCheck(raw, intel = {}) {
  const result = analyze(raw, intel);

  return {
    band: result.band,
    score: result.score,
    reasons: result.reasons,
    why: result.why,
    whatNotToDo: result.whatNotToDo,
    normalizedText: result.normalized.text,
    intelVersion: intel?.version || 'unknown',
    evidence: result.evidence
  };
}

module.exports = { runCheck };