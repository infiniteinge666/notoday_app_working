'use strict';

function stringValue(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numberValue(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => stringValue(item))
    .filter(Boolean);
}

function normalizeWeightedEntries(value, defaults = {}) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === 'string') {
        const normalizedValue = stringValue(item).toLowerCase();
        if (!normalizedValue) return null;

        return {
          value: normalizedValue,
          category: defaults.category || 'generic',
          weight: defaults.weight || 0
        };
      }

      if (!item || typeof item !== 'object') return null;

      const normalizedValue = stringValue(item.value || item.domain).toLowerCase();
      if (!normalizedValue) return null;

      return {
        ...item,
        value: normalizedValue,
        category: stringValue(item.category, defaults.category || 'generic'),
        weight: numberValue(item.weight, defaults.weight || 0),
        label: stringValue(item.label, ''),
        reason: stringValue(item.reason, ''),
        band: stringValue(item.band, ''),
        whatNotToDo: normalizeStringList(item.whatNotToDo),
        metadata: item.metadata && typeof item.metadata === 'object' ? { ...item.metadata } : undefined
      };
    })
    .filter(Boolean);
}

function normalizePatternEntries(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (typeof item === 'string') {
        const pattern = stringValue(item);
        if (!pattern) return null;

        return {
          id: `rule_${index + 1}`,
          value: pattern,
          pattern,
          label: 'Intel rule',
          flags: 'i',
          category: 'unknown',
          weight: 0,
          absolute: false,
          band: '',
          reason: '',
          whatNotToDo: []
        };
      }

      if (!item || typeof item !== 'object') return null;

      const pattern = stringValue(item.pattern || item.value);
      if (!pattern) return null;

      return {
        ...item,
        id: stringValue(item.id, `rule_${index + 1}`),
        value: pattern,
        pattern,
        label: stringValue(item.label || item.category, 'Intel rule'),
        flags: stringValue(item.flags, 'i'),
        category: stringValue(item.category, 'unknown'),
        weight: numberValue(item.weight, 0),
        absolute: Boolean(item.absolute),
        band: stringValue(item.band, ''),
        reason: stringValue(item.reason, ''),
        whatNotToDo: normalizeStringList(item.whatNotToDo),
        metadata: item.metadata && typeof item.metadata === 'object' ? { ...item.metadata } : undefined
      };
    })
    .filter(Boolean);
}

function validateIntelSchema(raw = {}) {
  return {
    version: stringValue(raw.version, 'unknown'),
    updatedAt: stringValue(raw.updatedAt, null),
    knownBadDomains: normalizeWeightedEntries(raw.knownBadDomains, {
      category: 'known_bad_domain',
      weight: 100
    }),
    scamDomainKeywords: normalizeWeightedEntries(raw.scamDomainKeywords, {
      category: 'domain_keyword',
      weight: 0
    }),
    scamPatterns: normalizePatternEntries(raw.scamPatterns),
    saOfficialDomains: normalizeWeightedEntries(raw.saOfficialDomains, {
      category: 'official_domain',
      weight: 0
    })
  };
}

module.exports = { validateIntelSchema };
