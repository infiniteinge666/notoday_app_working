"use strict";

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "../data/tokens.json");

function load() {
  return JSON.parse(fs.readFileSync(FILE, "utf-8"));
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function getClientId(req) {
  return req.headers["x-device-id"] || req.ip;
}

function checkAccess(req) {
  const data = load();

  const token = req.headers["x-api-token"] || null;
  const client = getClientId(req);

  // PAID TOKEN
  if (token && data.tokens[token]) {
    return { allowed: true, type: "PAID" };
  }

  // FREE TIER
  const limit = data.FREE_LIMIT;
  const used = data.usage[client] || 0;

  if (used >= limit) {
    return { allowed: false, reason: "Free limit reached" };
  }

  return { allowed: true, type: "FREE", remaining: limit - used };
}

function recordUsage(req) {
  const data = load();
  const client = getClientId(req);

  data.usage[client] = (data.usage[client] || 0) + 1;

  save(data);
}

module.exports = {
  checkAccess,
  recordUsage
};