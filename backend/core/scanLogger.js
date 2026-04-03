'use strict';

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'data');
const LOG_FILE = path.join(LOG_DIR, 'scan.log');

try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch {}

function logScan(meta = {}) {
  try {
    const record = {
      t: Date.now(),
      ip: meta.ip || null,
      ingress: meta.ingress || 'TEXT',
      len: Number(meta.len) || 0
    };

    fs.appendFile(LOG_FILE, JSON.stringify(record) + '\n', () => {});
  } catch {}
}

module.exports = { logScan };