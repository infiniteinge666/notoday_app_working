'use strict';

const fs = require('fs');
const path = require('path');

const SCAN_LOG_PATH = path.join(__dirname, '../../data/scan.log');
const ERROR_LOG_PATH = path.join(__dirname, '../../data/error.log');

// =========================
// SAFE FILE READ
// =========================
function safeRead(filePath, limit = 100) {
  try {
    if (!fs.existsSync(filePath)) return [];

    const lines = fs.readFileSync(filePath, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .slice(-limit)
      .reverse();

    return lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

  } catch {
    return [];
  }
}

// =========================
// HANDLER
// =========================
function httpLogsHandler(req, res) {
  try {
    const scans = safeRead(SCAN_LOG_PATH);
    const errors = safeRead(ERROR_LOG_PATH);

    return res.json({
      success: true,
      data: {
        scans,
        errors
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Log retrieval failed'
    });
  }
}

module.exports = httpLogsHandler;