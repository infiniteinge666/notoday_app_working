"use strict";

/**
 * NoToday - match.js
 * Multilingual-safe deterministic matching.
 *
 * Supports:
 * - known bad domains
 * - domain keyword scoring
 * - text pattern scoring
 * - absolute scam signals
 * - structural "free money" / multiplier detection
 */

const {
  normalizeInput,
  tokenizeInput,
  extractNumbers,
  extractDomains,
} = require("./normalize");

const DEFAULT_REASON_MAP = {
  known_bad_domain: "This message links to a known scam domain.",
  suspicious_domain_keyword: "The link contains scam-like domain wording.",
  suspicious_text_pattern: "The wording matches known scam behaviour.",
  free_money: "This message promises unrealistic returns or free money.",
  urgency: "The message creates time pressure to stop you verifying.",
  credential_request: "The message asks for sensitive financial or login information.",
  private_account_payment: "The message suggests payment to a personal account.",
};

const BUILT_IN_FREE_MONEY_TOKENS = [
  "free",
  "gratis",
  "gratuit",
  "gratuito",
  "gratuita",
  "무료",
  "ฟรี",
  "免费",
  "免費",
  "бесплатно",
  "bonus",
  "bono",
  "โบนัส",
  "奖励",
  "獎勵",
  "reward",
  "prize",
  "win",
  "winnings",
  "gift",
  "cashback",
  "double",
  "triple",
  "x2",
  "x3",
];

const BUILT_IN_DEPOSIT_TOKENS = [
  "deposit",
  "pay",
  "payment",
  "send",
  "topup",
  "top-up",
  "fund",
  "transfer",
  "เติมเงิน",
  "ฝาก",
  "โอน",
  "充值",
  "入金",
  "оплат",
  "пополн",
];

const BUILT_IN_RECEIVE_TOKENS = [
  "get",
  "receive",
  "claim",
  "earn",
  "collect",
  "obtain",
  "รับ",
  "ได้",
  "领取",
  "получ",
];

const BUILT_IN_URGENCY_TOKENS = [
  "urgent",
  "immediately",
  "now",
  "today",
  "final chance",
  "limited time",
  "only today",
  "act now",
  "expires",
  "last chance",
  "30 seconds",
  "1 hour",
  "2 hours",
  "deadline",
  "ด่วน",
  "ตอนนี้",
  "วันนี้เท่านั้น",
  "限时",
  "立即",
  "срочно",
];

const BUILT_IN_CREDENTIAL_TOKENS = [
  "otp",
  "pin",
  "cvv",
  "password",
  "passcode",
  "verification code",
  "one-time pin",
  "banking app screenshot",
  "card number",
  "security code",
];

const BUILT_IN_PRIVATE_ACCOUNT_TOKENS = [
  "personal account",
  "private account",
  "individual account",
  "pay this person",
  "send to my account",
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toPatternObjects(list, defaultWeight = 25, defaultCategory = "generic") {
  return asArray(list)
    .map((entry) => {
      if (typeof entry === "string") {
        return {
          value: normalizeInput(entry),
          weight: defaultWeight,
          category: defaultCategory,
        };
      }

      if (entry && typeof entry === "object" && entry.value) {
        return {
          value: normalizeInput(entry.value),
          weight: Number.isFinite(Number(entry.weight)) ? Number(entry.weight) : defaultWeight,
          category: normalizeInput(entry.category || defaultCategory),
        };
      }

      return null;
    })
    .filter(Boolean)
    .filter((entry) => entry.value.length > 0);
}

function uniqueStrings(list) {
  return Array.from(new Set(asArray(list).map((x) => normalizeInput(x)).filter(Boolean)));
}

function includesAny(text, patterns) {
  return patterns.some((pattern) => pattern && text.includes(pattern));
}

function findKnownBadDomainHit(text, intel = {}) {
  const domains = extractDomains(text);
  const knownBadDomains = uniqueStrings(intel.knownBadDomains);

  for (const domain of domains) {
    for (const bad of knownBadDomains) {
      if (domain === bad || domain.endsWith(`.${bad}`) || domain.includes(bad)) {
        return {
          hit: true,
          domain,
          matched: bad,
          reason: DEFAULT_REASON_MAP.known_bad_domain,
          score: 100,
        };
      }
    }
  }

  return {
    hit: false,
    domain: null,
    matched: null,
    reason: null,
    score: 0,
  };
}

function scoreDomainKeywords(text, intel = {}) {
  const domains = extractDomains(text);
  const domainKeywordPatterns = toPatternObjects(intel.scamDomainKeywords, 25, "domain_keyword");

  const matches = [];
  let total = 0;

  if (domains.length === 0 || domainKeywordPatterns.length === 0) {
    return { score: 0, matches };
  }

  for (const domain of domains) {
    for (const pattern of domainKeywordPatterns) {
      if (domain.includes(pattern.value)) {
        matches.push({
          value: pattern.value,
          weight: pattern.weight,
          category: "suspicious_domain_keyword",
          reason: DEFAULT_REASON_MAP.suspicious_domain_keyword,
          source: domain,
        });
        total += pattern.weight;
      }
    }
  }

  return {
    score: Math.min(total, 90),
    matches,
  };
}

function scoreTextPatterns(text, intel = {}) {
  const normalized = normalizeInput(text);
  const patternObjects = toPatternObjects(intel.scamPatterns, 20, "text_pattern");

  const matches = [];
  let total = 0;

  for (const pattern of patternObjects) {
    if (normalized.includes(pattern.value)) {
      matches.push({
        value: pattern.value,
        weight: pattern.weight,
        category: pattern.category || "suspicious_text_pattern",
        reason:
          pattern.category === "credentials"
            ? DEFAULT_REASON_MAP.credential_request
            : DEFAULT_REASON_MAP.suspicious_text_pattern,
      });
      total += pattern.weight;
    }
  }

  return {
    score: Math.min(total, 95),
    matches,
  };
}

function detectUrgencySignals(text) {
  const normalized = normalizeInput(text);
  const tokenHit = includesAny(normalized, BUILT_IN_URGENCY_TOKENS);

  if (!tokenHit) {
    return { hit: false, reason: null, score: 0 };
  }

  return {
    hit: true,
    reason: DEFAULT_REASON_MAP.urgency,
    score: 30,
  };
}

function detectCredentialSignals(text, intel = {}) {
  const normalized = normalizeInput(text);
  const builtInHit = includesAny(normalized, BUILT_IN_CREDENTIAL_TOKENS);

  const patternObjects = toPatternObjects(intel.scamPatterns, 20, "text_pattern");
  const intelCredentialHit = patternObjects.some((entry) => {
    const category = entry.category || "";
    return (category === "credentials" || category === "absolute") && normalized.includes(entry.value);
  });

  if (!builtInHit && !intelCredentialHit) {
    return { hit: false, reason: null, score: 0 };
  }

  return {
    hit: true,
    reason: DEFAULT_REASON_MAP.credential_request,
    score: 100,
  };
}

function detectPrivateAccountPayment(text) {
  const normalized = normalizeInput(text);

  if (!includesAny(normalized, BUILT_IN_PRIVATE_ACCOUNT_TOKENS)) {
    return { hit: false, reason: null, score: 0 };
  }

  return {
    hit: true,
    reason: DEFAULT_REASON_MAP.private_account_payment,
    score: 100,
  };
}

function hasAscendingAdjacentNumbers(numbers) {
  if (!Array.isArray(numbers) || numbers.length < 2) return false;

  for (let i = 0; i < numbers.length - 1; i += 1) {
    const current = numbers[i];
    const next = numbers[i + 1];

    if (!Number.isFinite(current) || !Number.isFinite(next)) continue;
    if (next > current) return true;
  }

  return false;
}

function detectMultiplierPattern(text) {
  const normalized = normalizeInput(text);
  const tokens = tokenizeInput(normalized);
  const numbers = extractNumbers(normalized);

  const hasAscendingNumbers = hasAscendingAdjacentNumbers(numbers);
  const hasFreeMoneyToken = includesAny(normalized, BUILT_IN_FREE_MONEY_TOKENS);
  const hasDepositToken = includesAny(normalized, BUILT_IN_DEPOSIT_TOKENS);
  const hasReceiveToken = includesAny(normalized, BUILT_IN_RECEIVE_TOKENS);
  const hasMultiplierToken =
    /\bx\s?[2-9]\b/.test(normalized) ||
    /\b[2-9]x\b/.test(normalized) ||
    normalized.includes("triple") ||
    normalized.includes("double");

  /**
   * High-confidence structure:
   * - ascending monetary numbers
   * AND
   * - free/bonus/multiplier wording
   * OR
   * - deposit/pay + receive/get wording
   */
  const structuralHit =
    hasAscendingNumbers &&
    (hasFreeMoneyToken || hasMultiplierToken || (hasDepositToken && hasReceiveToken));

  if (!structuralHit) {
    return {
      hit: false,
      numbers,
      tokens,
      reason: null,
      score: 0,
    };
  }

  return {
    hit: true,
    numbers,
    tokens,
    reason: DEFAULT_REASON_MAP.free_money,
    score: 100,
  };
}

function checkAbsoluteTextSignals(text, intel = {}) {
  const normalized = normalizeInput(text);

  const patternObjects = toPatternObjects(intel.scamPatterns, 20, "text_pattern");
  const intelAbsolute = patternObjects.find((entry) => {
    const category = entry.category || "";
    return (category === "absolute" || category === "credentials") && normalized.includes(entry.value);
  });

  if (intelAbsolute) {
    return {
      hit: true,
      category: intelAbsolute.category,
      reason:
        intelAbsolute.category === "credentials"
          ? DEFAULT_REASON_MAP.credential_request
          : DEFAULT_REASON_MAP.suspicious_text_pattern,
      score: 100,
      matched: intelAbsolute.value,
    };
  }

  const credentialHit = detectCredentialSignals(normalized, intel);
  if (credentialHit.hit) {
    return {
      hit: true,
      category: "credentials",
      reason: credentialHit.reason,
      score: 100,
      matched: null,
    };
  }

  const privateAccountHit = detectPrivateAccountPayment(normalized);
  if (privateAccountHit.hit) {
    return {
      hit: true,
      category: "private_account_payment",
      reason: privateAccountHit.reason,
      score: 100,
      matched: null,
    };
  }

  const freeMoneyHit = detectMultiplierPattern(normalized);
  if (freeMoneyHit.hit) {
    return {
      hit: true,
      category: "free_money",
      reason: freeMoneyHit.reason,
      score: 100,
      matched: null,
    };
  }

  return {
    hit: false,
    category: null,
    reason: null,
    score: 0,
    matched: null,
  };
}

module.exports = {
  findKnownBadDomainHit,
  scoreDomainKeywords,
  scoreTextPatterns,
  detectUrgencySignals,
  detectCredentialSignals,
  detectPrivateAccountPayment,
  detectMultiplierPattern,
  checkAbsoluteTextSignals,
};