'use strict';

const fs = require('fs');
const path = require('path');
const { validateIntelSchema } = require('./schema');

function loadIntel(filePath) {
  const resolved = path.resolve(filePath);

  try {
    const raw = fs.readFileSync(resolved, 'utf8');
    const parsed = JSON.parse(raw);
    const intel = validateIntelSchema(parsed);

    return {
      intel,
      degraded: false,
      intelPath: resolved,
      error: null
    };
  } catch (err) {
    console.error('Intel load failed:', err.message, resolved);

    return {
      intel: validateIntelSchema({
        version: 'fallback',
        updatedAt: null,
        knownBadDomains: [],
        scamDomainKeywords: [],
        scamPatterns: []
      }),
      degraded: true,
      intelPath: resolved,
      error: err.message
    };
  }
}

module.exports = { loadIntel };