"use strict";

const fs = require("fs");
const path = require("path");

const PRIMARY_INTEL_PATH = path.join(__dirname, "..", "data", "scamIntel.json");

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeIntelShape(intel) {
  const safeIntel = intel && typeof intel === "object" ? intel : {};

  return {
    version: safeIntel.version || "fallback",
    degraded: Boolean(safeIntel.degraded),
    knownBadDomains: ensureArray(safeIntel.knownBadDomains),
    scamDomainKeywords: ensureArray(safeIntel.scamDomainKeywords),
    scamPatterns: ensureArray(safeIntel.scamPatterns)
  };
}

function buildFallbackIntel(reason) {
  return {
    version: "fallback",
    degraded: true,
    reason,
    knownBadDomains: [],
    scamDomainKeywords: [],
    scamPatterns: []
  };
}

function loadIntelOrDie() {
  try {
    if (!fs.existsSync(PRIMARY_INTEL_PATH)) {
      return buildFallbackIntel("Primary intel file missing");
    }

    const parsed = readJsonFile(PRIMARY_INTEL_PATH);
    const intel = normalizeIntelShape(parsed);
    intel.degraded = false;
    return intel;
  } catch (error) {
    return buildFallbackIntel(error && error.message ? error.message : "Intel load failed");
  }
}

module.exports = loadIntelOrDie;