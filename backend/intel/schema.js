'use strict';

function stringValue(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function toStringEntryArray(value) {
  if (!Array.isArray(value)) return [];

  return [...new Set(
    value
      .map(item => {
        if (typeof item === 'string') return item.trim().toLowerCase();
        if (item && typeof item === 'object' && typeof item.value === 'string') {
          return item.value.trim().toLowerCase();
        }
        return '';
      })
      .filter(Boolean)
  )];
}

function patternArray(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;

      const pattern = stringValue(item.pattern || item.value);
      if (!pattern) return null;

      return {
        id: stringValue(item.id, `rule_${index + 1}`),
        label: stringValue(item.label || item.category, 'Intel rule'),
        pattern,
        flags: stringValue(item.flags, 'i'),
        weight: Number(item.weight) || 0,
        absolute: Boolean(item.absolute),
        band: stringValue(item.band, ''),
        reason: stringValue(item.reason, ''),
        whatNotToDo: Array.isArray(item.whatNotToDo)
          ? item.whatNotToDo.map(x => String(x || '').trim()).filter(Boolean)
          : []
      };
    })
    .filter(Boolean);
}

function validateIntelSchema(raw = {}) {
  return {
    version: stringValue(raw.version, 'unknown'),
    updatedAt: stringValue(raw.updatedAt, null),
    knownBadDomains: toStringEntryArray(raw.knownBadDomains),
    scamDomainKeywords: toStringEntryArray(raw.scamDomainKeywords),
    scamPatterns: patternArray(raw.scamPatterns),
    saOfficialDomains: toStringEntryArray(raw.saOfficialDomains)
  };
}

module.exports = { validateIntelSchema };