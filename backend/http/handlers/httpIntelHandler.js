'use strict';

module.exports = function httpIntelHandler(req, res) {
  const state = req.app.locals.intelState || {};
  const intel = state.intel || {};

  res.json({
    success: true,
    message: 'OK',
    data: {
      version: intel.version || 'unknown',
      updatedAt: intel.updatedAt || null,
      degraded: Boolean(state.degraded),
      knownBadDomains: Array.isArray(intel.knownBadDomains) ? intel.knownBadDomains.length : 0,
      scamDomainKeywords: Array.isArray(intel.scamDomainKeywords) ? intel.scamDomainKeywords.length : 0,
      scamPatterns: Array.isArray(intel.scamPatterns) ? intel.scamPatterns.length : 0
    }
  });
};