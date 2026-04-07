'use strict';

const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '../data/scan.log');
const ERROR_PATH = path.join(__dirname, '../data/error.log');

function now() {
  return new Date().toISOString();
}

// =========================
// SCAN LOG
// =========================
function logScan({ band, scamClass, ingress }) {
  try {
    const line = JSON.stringify({
      time: now(),
      band,
      class: scamClass,
      ingress
    });

    fs.appendFileSync(LOG_PATH, line + '\n', 'utf8');
  } catch (err) {
    // silent fail (logging must never break system)
  }
}

// =========================
// ERROR LOG
// =========================
function logError(type) {
  try {
    const line = JSON.stringify({
      time: now(),
      error: type
    });

    fs.appendFileSync(ERROR_PATH, line + '\n', 'utf8');
  } catch (err) {
    // silent fail
  }
}

module.exports = {
  logScan,
  logError
};