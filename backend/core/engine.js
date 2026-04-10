"use strict";

/**
 * NoToday - engine.js
 * Deterministic scan engine (FIXED)
 *
 * Critical Fix:
 * - Absolute indicators are now correctly wired into scoring
 * - No more SAFE on obvious scams
 */

const { normalizeInput } = require("./normalize");

const {
  findKnownBadDomainHit,
  scoreDomainKeywords,
  scoreTextPatterns,
  detectUrgencySignals,
  checkAbsoluteTextSignals, // 🔥 REQUIRED
} = require("./match");

const { scoreEvidence } = require("./score");

/**
 * Ensure safe string handling
 */
function safeString(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return String(value);
}

/**
 * Normalize incoming payload structure
 */
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
    imageText: safeString(input.imageText || input.ocrText || ""),
    link: safeString(input.link || ""),
    emailBody: safeString(input.emailBody || ""),
    metadata: safeString(input.metadata || ""),
  };
}

/**
 * Combine all possible input sources
 */
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

/**
 * Deduplicate reasons
 */
function dedupeStrings(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
}

/**
 * Human explanation layer
 */
function formatExplanation(result) {
  const reasons = Array.isArray(result.reasons) ? result.reasons : [];

  if (result.band === "CRITICAL") {
    return dedupeStrings([
      ...reasons,
      "This is highly likely to be a scam. Do not engage or send money.",
    ]);
  }

  if (result.band === "SUSPICIOUS") {
    return dedupeStrings([
      ...reasons,
      "This message shows warning signs. Verify independently before acting.",
    ]);
  }

  return dedupeStrings([
    ...reasons,
    "No strong scam indicators detected, but always verify before sending money.",
  ]);
}

/**
 * MAIN ENGINE
 */
function runCheck(input, intel = {}) {
  const ingress = coalesceInput(input);
  const rawText = buildScanText(ingress);
  const normalizedText = normalizeInput(rawText);

  // FAIL-SAFE: no content
  if (!normalizedText) {
    return {
      band: "SAFE",
      score: 0,
      reasons: ["No readable content provided."],
      explanation: ["No readable content provided."],
      whatNotToDo: ["Do not assume safety without verifying the source."],
    };
  }

  // 🔥 CRITICAL FIX — ABSOLUTE DETECTION FIRST
  const absolute = checkAbsoluteTextSignals(normalizedText, intel);

  // OPTIONAL DEBUG (keep for now)
  if (absolute.hit) {
    console.log("[ABSOLUTE HIT]", absolute.reason);
  }

  // DOMAIN CHECK
  const knownBadDomain = findKnownBadDomainHit(normalizedText, intel);

  // SCORING SIGNALS
  const domainKeywordResult = scoreDomainKeywords(normalizedText, intel);
  const textPatternResult = scoreTextPatterns(normalizedText, intel);
  const urgencyResult = detectUrgencySignals(normalizedText);

  // COLLECT REASONS
  const rawReasons = [
    ...domainKeywordResult.matches.map((m) => m.reason),
    ...textPatternResult.matches.map((m) => m.reason),
  ];

  if (urgencyResult.hit && urgencyResult.reason) {
    rawReasons.push(urgencyResult.reason);
  }

  // 🔥 FIXED SCORING PIPELINE
  const scored = scoreEvidence({
    absolute, // 🔥 THIS WAS MISSING — NOW FIXED
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
 * Compatibility alias
 */
function scan(input, intel = {}) {
  return runCheck(input, intel);
}

module.exports = {
  runCheck,
  scan,
};