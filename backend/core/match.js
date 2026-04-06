'use strict';

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const out = [];

  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }

  return out;
}

function matchesDomain(host, candidate) {
  return host === candidate || host.endsWith(`.${candidate}`);
}

function pushEvidence(list, entry) {
  list.push({
    type: entry.type || 'signal',
    label: entry.label || 'Signal detected',
    reason: entry.reason || entry.label || 'Signal detected',
    weight: Number(entry.weight) || 0,
    absolute: Boolean(entry.absolute),
    whatNotToDo: Array.isArray(entry.whatNotToDo) ? entry.whatNotToDo : [],
    band: entry.band || null,
    source: entry.source || null
  });
}

function collectEvidence(normalized, intel = {}) {
  const evidence = [];
  const domains = Array.isArray(normalized.domains) ? normalized.domains : [];
  const lower = normalized.lower || '';

  const knownBadDomains = Array.isArray(intel.knownBadDomains) ? intel.knownBadDomains : [];
  const scamDomainKeywords = Array.isArray(intel.scamDomainKeywords) ? intel.scamDomainKeywords : [];
  const scamPatterns = Array.isArray(intel.scamPatterns) ? intel.scamPatterns : [];

  for (const domain of domains) {
    for (const bad of knownBadDomains) {
      if (matchesDomain(domain, bad)) {
        pushEvidence(evidence, {
          type: 'known_bad_domain',
          label: `Known bad domain detected: ${domain}`,
          reason: `The message references a domain already marked as malicious: ${domain}.`,
          weight: 100,
          absolute: true,
          whatNotToDo: ['Do not open the link or sign in on that site.'],
          source: domain
        });
      }
    }

    for (const keyword of scamDomainKeywords) {
      if (domain.includes(keyword)) {
        pushEvidence(evidence, {
          type: 'suspicious_domain_keyword',
          label: `Suspicious domain wording: ${domain}`,
          reason: `The domain contains scam-like wording (“${keyword}”).`,
          weight: 25,
          whatNotToDo: ['Do not trust a site purely because its name sounds official.'],
          source: domain
        });
      }
    }
  }

  const builtInRules = [
    {
      type: 'credential_request',
      label: 'Credential request',
      pattern: /(password|passcode|otp|one[- ]time (pin|passcode|password)|cvv|seed phrase|recovery phrase|banking details|card number)/i,
      weight: 100,
      absolute: true,
      reason: 'The message asks for sensitive credentials or verification codes.',
      whatNotToDo: ['Do not share passwords, OTPs, CVVs, or seed phrases.']
    },
    {
      type: 'urgent_threat',
      label: 'Urgency or threat language',
      pattern: /(urgent|immediately|within 24 hours|suspended|locked|final warning|avoid closure)/i,
      weight: 25,
      reason: 'The message uses pressure or fear to rush a response.',
      whatNotToDo: ['Do not act under pressure from the message alone.']
    },
    {
      type: 'payment_request',
      label: 'Unusual payment request',
      pattern: /(gift ?card|crypto|bitcoin|usdt|wire transfer|bank transfer)/i,
      weight: 45,
      reason: 'The message requests payment through channels often used in scams.',
      whatNotToDo: ['Do not send payment before verifying through an official channel.']
    },
    {
      type: 'login_lure',
      label: 'Account verification lure',
      pattern: /(verify your account|confirm your account|log in now|sign in now|secure your account)/i,
      weight: 35,
      reason: 'The message pushes an account login or verification step.',
      whatNotToDo: ['Do not sign in from links sent in messages.']
    }
  ];

  for (const rule of builtInRules) {
    if (rule.pattern.test(lower)) {
      pushEvidence(evidence, rule);
    }
  }

  for (const item of scamPatterns) {
    try {
      const regex = new RegExp(item.pattern, item.flags || 'i');
      if (!regex.test(normalized.text)) continue;

      pushEvidence(evidence, {
        type: item.id || 'intel_rule',
        label: item.label || 'Intel pattern matched',
        reason: item.reason || item.label || 'Intel pattern matched.',
        weight: Number(item.weight) || 0,
        absolute: Boolean(item.absolute),
        whatNotToDo: Array.isArray(item.whatNotToDo) ? item.whatNotToDo : [],
        band: item.band || null,
        source: item.id || 'intel'
      });
    } catch {
      // ignore invalid regex rules
    }
  }

  return uniqueBy(evidence, item => `${item.type}|${item.label}|${item.reason}`);
}

module.exports = { collectEvidence };