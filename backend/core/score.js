"use strict";

/**
 * NoToday - score.js
 * Deterministic score aggregation and final band selection.
 */

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function dedupeStrings(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
}

function buildWhatNotToDo(band) {
  if (band === "CRITICAL") {
    return [
      "Do not send money.",
      "Do not click links or continue the conversation.",
      "Do not share passwords, OTPs, PINs, CVVs, card details, screenshots, or ID documents.",
    ];
  }

  if (band === "SUSPICIOUS") {
    return [
      "Do not act until you verify the request independently.",
      "Do not use the contact details provided in the message itself.",
      "Do not send money or sensitive information until verified.",
    ];
  }

  return [
    "Stay cautious and verify anything involving money or personal information.",
  ];
}

function buildSummaryBand(score) {
  if (score >= 85) return "CRITICAL";
  if (score >= 35) return "SUSPICIOUS";
  return "SAFE";
}

function scoreEvidence(evidence = {}) {
  const absolute = evidence.absolute || null;
  const knownBadDomain = evidence.knownBadDomain || null;
  const textScore = Number.isFinite(evidence.textScore) ? evidence.textScore : 0;
  const domainScore = Number.isFinite(evidence.domainScore) ? evidence.domainScore : 0;
  const urgencyScore = Number.isFinite(evidence.urgencyScore) ? evidence.urgencyScore : 0;
  const reasons = Array.isArray(evidence.reasons) ? evidence.reasons : [];

  if (absolute && absolute.hit) {
    return {
      band: "CRITICAL",
      score: 100,
      reasons: dedupeStrings([absolute.reason, ...reasons]),
      whatNotToDo: buildWhatNotToDo("CRITICAL"),
    };
  }

  if (knownBadDomain && knownBadDomain.hit) {
    return {
      band: "CRITICAL",
      score: 100,
      reasons: dedupeStrings([knownBadDomain.reason, ...reasons]),
      whatNotToDo: buildWhatNotToDo("CRITICAL"),
    };
  }

  const rawScore = textScore + domainScore + urgencyScore;
  const finalScore = clamp(Math.round(rawScore), 0, 99);
  const band = buildSummaryBand(finalScore);

  return {
    band,
    score: finalScore,
    reasons:
      dedupeStrings(reasons).length > 0
        ? dedupeStrings(reasons)
        : ["No strong scam indicators were detected in this input."],
    whatNotToDo: buildWhatNotToDo(band),
  };
}

module.exports = {
  scoreEvidence,
};