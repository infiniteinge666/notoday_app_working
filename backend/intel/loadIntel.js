'use strict';

const fs = require('fs');
const { validateIntelSchema } = require('./schema');

function loadIntel(intelPath) {
  let intel = null;
  let degraded = false;

  console.log('[loadIntel] start', {
    intelPath
  });

  try {
    const raw = fs.readFileSync(intelPath, 'utf8');

    console.log('[loadIntel] file:read_success', {
      intelPath,
      bytes: Buffer.byteLength(raw, 'utf8')
    });

    const parsed = JSON.parse(raw);

    console.log('[loadIntel] file:parse_success', {
      intelPath,
      version: parsed?.version || 'unknown'
    });

    // 🔥 Correct validation (normalizer, not validator with ok flag)
    const normalized = validateIntelSchema(parsed);

    if (!normalized || typeof normalized !== 'object') {
      degraded = true;
      intel = null;

      console.error('[loadIntel] degraded:validation_failed', {
        intelPath
      });
    } else {
      intel = normalized;

      console.log('[loadIntel] counts', {
        version: intel?.version || 'unknown',
        scamPatterns: Array.isArray(intel?.scamPatterns) ? intel.scamPatterns.length : 0,
        knownBadDomains: Array.isArray(intel?.knownBadDomains) ? intel.knownBadDomains.length : 0,
        scamDomainKeywords: Array.isArray(intel?.scamDomainKeywords) ? intel.scamDomainKeywords.length : 0,
        saOfficialDomains: Array.isArray(intel?.saOfficialDomains) ? intel.saOfficialDomains.length : 0
      });
    }
  } catch (e) {
    degraded = true;
    intel = null;

    console.error('[loadIntel] degraded:load_failed', {
      intelPath,
      message: e?.message || 'Unknown load error',
      stack: e?.stack || null
    });
  }

  console.log('[loadIntel] end', {
    intelPath,
    degraded,
    hasIntel: !!intel,
    version: intel?.version || 'unknown'
  });

  return { intelPath, intel, degraded };
}

module.exports = { loadIntel };