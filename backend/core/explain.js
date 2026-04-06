'use strict';

function dedupe(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

function buildExplanation(scoring, evidence, intel = {}) {
  const why = dedupe(
    evidence
      .slice()
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))
      .map(item => item.reason || item.label)
      .slice(0, 5)
  );

  const whatNotToDo = dedupe([
    ...evidence.flatMap(item => item.whatNotToDo || []),
    ...(scoring.band === 'CRITICAL'
      ? ['Do not click links, call listed numbers, or reply to the sender.']
      : []),
    ...(scoring.band === 'SUSPICIOUS'
      ? ['Verify independently with the official company website or app.']
      : [])
  ]).slice(0, 5);

  let reasons = scoring.reasons;
  if (!Array.isArray(reasons) || !reasons.length) {
    reasons = ['No strong scam indicators detected.'];
  }

  return {
    reasons,
    why,
    whatNotToDo,
    intelVersion: intel?.version || 'unknown'
  };
}

module.exports = { buildExplanation };