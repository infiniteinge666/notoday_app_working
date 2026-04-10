"use strict";

/**
 * NoToday - engine.js
 * Main deterministic scan engine.
 *
 * Exports:
 * - runCheck(input, intel)
 * - scan(input, intel)  // alias for compatibility
 */

const { normalizeInput } = require("./normalize");
const {
  findKnownBadDomainHit,
  scoreDomainKeywords,
  scoreTextPatterns,
  detectUrgencySignals,
  checkAbsoluteTextSignals,
} = require("./match");
const { scoreEvidence } = require("./score");

function safeString(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return String(value);
}

function coalesceInput(input) {
  if (typeof input === "string") {
    return {
      text: input,
      imageText: "",
      link: "",
      emailBody: "",
      metadata: "",
    };
  }

  if (!input || typeof input !== "object") {
    return {
      text: "",
      imageText: "",
      link: "",
      emailBody: "",
      metadata: "",
    };
  }

  return {
    text: safeString(input.text),
    imageText: safeString(input.imageText || input.ocrText || input.image || ""),
    link: safeString(input.link || ""),
    emailBody: safeString(input.emailBody || ""),
    metadata: safeString(input.metadata || ""),
  };
}

function buildScanText(input) {
  const parts = [
    safeString(input.text),
    safeString(input.emailBody),
    safeString(input.imageText),
    safeString(input.link),
    safeString(input.metadata),
  ].filter(Boolean);

  return parts.join(" \n ");
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

function formatExplanation(result) {
  const reasons = Array.isArray(result.reasons) ? result.reasons : [];

  if (result.band === "CRITICAL") {
    return dedupeStrings([
      ...reasons,
      "This looks dangerous enough that you should treat it as a scam.",
    ]);
  }

  if (result.band === "SUSPICIOUS") {
    return dedupeStrings([
      ...reasons,
      "There are enough warning signs here that you should verify independently before doing anything.",
    ]);
  }

  return dedupeStrings([
    ...reasons,
    "No strong scam indicators were detected, but you should still verify anything involving money or personal information.",
  ]);
}

function runCheck(input, intel = {}) {
  const ingress = coalesceInput(input);
  const rawText = buildScanText(ingress);
  const normalizedText = normalizeInput(rawText);

  if (!normalizedText) {
    return {
      band: "SAFE",
      score: 0,
      reasons: ["No readable content was provided for analysis."],
      explanation: ["No readable content was provided for analysis."],
      whatNotToDo: [
        "Do not assume a message is safe just because it could not be read.",
      ],
    };
  }

  const knownBadDomain = findKnownBadDomainHit(normalizedText, intel);
  const absolute = checkAbsoluteTextSignals(normalizedText, intel);

  const domainKeywordResult = scoreDomainKeywords(normalizedText, intel);
  const textPatternResult = scoreTextPatterns(normalizedText, intel);
  const urgencyResult = detectUrgencySignals(normalizedText);

  const rawReasons = [
    ...domainKeywordResult.matches.map((match) => match.reason),
    ...textPatternResult.matches.map((match) => match.reason),
  ];

  if (urgencyResult.hit && urgencyResult.reason) {
    rawReasons.push(urgencyResult.reason);
  }

  const scored = scoreEvidence({
    absolute,
    knownBadDomain,
    textScore: textPatternResult.score,
    domainScore: domainKeywordResult.score,
    urgencyScore: urgencyResult.score,
    reasons: rawReasons,
  });

  const explanation = formatExplanation(scored);

  return {
    band: scored.band,
    score: scored.score,
    reasons: scored.reasons,
    explanation,
    whatNotToDo: scored.whatNotToDo,
  };
}

/**
 * Compatibility alias.
 * Some older handlers call engine.scan(...).
 */
function scan(input, intel = {}) {
  return runCheck(input, intel);
}

module.exports = {
  runCheck,
  scan,
};