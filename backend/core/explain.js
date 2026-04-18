'use strict';

function dedupe(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean)
    )
  );
}

function buildExplanation(scoring = {}, evidence = {}, intel = {}) {
  const hits = Array.isArray(evidence.hits) ? evidence.hits.slice() : [];

  const why = dedupe(
    hits
      .sort((a, b) => (Number(b.weight) || 0) - (Number(a.weight) || 0))
      .map((hit) => hit.reason || hit.label || hit.value)
      .concat(scoring.reasons || [])
      .slice(0, 5)
  );

  const whatNotToDo = dedupe([
    ...hits.flatMap((hit) => (Array.isArray(hit.whatNotToDo) ? hit.whatNotToDo : [])),
    ...(Array.isArray(scoring.whatNotToDo) ? scoring.whatNotToDo : [])
  ]).slice(0, 5);

  return {
    why: why.length ? why : ['No strong scam indicators were detected in this input.'],
    whatNotToDo,
    intelVersion: intel?.version || 'unknown'
  };
}

module.exports = { buildExplanation };
