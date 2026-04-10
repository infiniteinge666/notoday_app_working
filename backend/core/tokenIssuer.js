"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FILE = path.join(__dirname, "../data/tokens.json");

function load() {
  return JSON.parse(fs.readFileSync(FILE, "utf-8"));
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function issueToken(meta = {}) {
  const data = load();

  const token = generateToken();

  data.tokens[token] = {
    type: "PAID",
    issuedAt: Date.now(),
    ...meta
  };

  save(data);

  return token;
}

module.exports = {
  issueToken
};