'use strict';

function scoreEvidence(evidence = []) {
  const absoluteTriggered = evidence.some(item => {
    return item.absolute || ['known_bad_domain', 'credential_request', 'credentials'].includes(item.type);
  });

  let score = evidence.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  score = absoluteTriggered ? 100 : Math.max(0, Math.min(99, score));

  let band = 'SAFE';
  if (score >= 80) band = 'CRITICAL';
  else if (score >= 35) band = 'SUSPICIOUS';

  const reasons = evidence.length
    ? evidence
        .slice()
        .sort((a, b) => (b.weight || 0) - (a.weight || 0))
        .map(item => item.reason || item.label)
        .filter(Boolean)
        .slice(0, 3)
    : ['No strong scam indicators detected.'];

  return {
    score,
    band,
    absoluteTriggered,
    reasons
  };
}

module.exports = { scoreEvidence };