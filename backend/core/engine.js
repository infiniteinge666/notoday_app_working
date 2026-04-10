"use strict";

/**
 * NoToday - engine.js
 * Deterministic scan engine
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
    imageText: safeString(input.imageText || input.ocrText || ""),
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

/**
 * Human-readable explanation builder
 */
function buildReasons(result, context = {}) {
  const reasons = [];

  const absolute = context.absolute || null;
  const knownBadDomain = context.knownBadDomain || null;
  const urgencyHit = Boolean(context.urgencyHit);

  // 🔴 FREE MONEY (ABSOLUTE)
  if (absolute && absolute.hit && absolute.category === "free_money") {
    const nums = Array.isArray(absolute.numbers) ? absolute.numbers : [];

    if (nums.length >= 2) {
      reasons.push(
        `This message promises more money than you send (${nums[0]} -> ${nums[1]}).`
      );
    } else {
      reasons.push("This message promises unrealistic returns or free money.");
    }

    reasons.push("Real money does not multiply instantly without real risk.");
  }

  // 🔴 CREDENTIAL REQUEST
  if (absolute && absolute.hit && absolute.category === "credentials") {
    reasons.push(
      "This message asks for sensitive information like an OTP, PIN, CVV, or password."
    );
    reasons.push(
      "Legitimate organisations will never ask for this information through messages."
    );
  }

  // 🔴 PRIVATE ACCOUNT PAYMENT
  if (absolute && absolute.hit && absolute.category === "private_account_payment") {
    reasons.push(
      "This message asks you to send money to a personal or private account."
    );
    reasons.push(
      "Legitimate businesses do not redirect payments to personal accounts."
    );
  }

  // 🔴 KNOWN BAD DOMAIN
  if (knownBadDomain && knownBadDomain.hit) {
    reasons.push(
      `This message links to a known scam domain (${knownBadDomain.domain}).`
    );
    reasons.push(
      "This domain has been flagged in scam activity before."
    );
  }

  // 🟠 URGENCY
  if (urgencyHit) {
    reasons.push(
      "The message creates urgency to pressure you into acting without verifying."
    );
  }

  // 🟡 GENERIC SUSPICIOUS
  if (reasons.length === 0 && result.band === "SUSPICIOUS") {
    reasons.push(
      "This message contains patterns commonly used in scams."
    );
    reasons.push(
      "You should verify this independently before taking action."
    );
  }

  // 🟢 SAFE
  if (reasons.length === 0 && result.band === "SAFE") {
    reasons.push(
      "No strong scam indicators were detected in this message."
    );
  }

  return Array.from(new Set(reasons));
}

function buildWhatNotToDo(band) {
  if (band === "CRITICAL") {
    return [
      "Do not send money.",
      "Do not click links.",
      "Do not share passwords, OTPs, PINs, CVVs, screenshots, or ID documents.",
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
    "Still verify independently before sending money or sharing personal information.",
  ];
}

function runCheck(input, intel = {}) {
  const ingress = coalesceInput(input);
  const rawText = buildScanText(ingress);
  const normalizedText = normalizeInput(rawText);

  if (!normalizedText) {
    return {
      band: "SAFE",
      score: 0,
      reasons: ["No readable content provided."],
      explanation: ["No readable content provided."],
      whatNotToDo: ["Do not assume safety without verifying the source."],
    };
  }

  const absolute = checkAbsoluteTextSignals(normalizedText, intel);
  const knownBadDomain = findKnownBadDomainHit(normalizedText, intel);
  const domainKeywordResult = scoreDomainKeywords(normalizedText, intel);
  const textPatternResult = scoreTextPatterns(normalizedText, intel);
  const urgencyResult = detectUrgencySignals(normalizedText);

  const rawReasons = [
    ...domainKeywordResult.matches.map((m) => m.reason),
    ...textPatternResult.matches.map((m) => m.reason),
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

  const explanation = buildReasons(scored, {
    absolute,
    knownBadDomain,
    urgencyHit: urgencyResult.hit,
  });

  return {
    band: scored.band,
    score: scored.score,
    reasons: explanation,
    explanation,
    whatNotToDo: buildWhatNotToDo(scored.band),
  };
}

function scan(input, intel = {}) {
  return runCheck(input, intel);
}

module.exports = {
  runCheck,
  scan,
};