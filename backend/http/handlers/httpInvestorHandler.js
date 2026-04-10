'use strict';

const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '../../data/scan.log');

// =========================
// SAFE READ
// =========================
function readLog() {
  try {
    if (!fs.existsSync(LOG_PATH)) return [];

    return fs.readFileSync(LOG_PATH, 'utf8')
      .trim()
      .split('\n')
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

  } catch {
    return [];
  }
}

// =========================
// DATE KEY
// =========================
function dayKey(ts) {
  const d = new Date(ts);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// =========================
// MAIN HANDLER
// =========================
module.exports = function httpInvestorHandler(req, res) {

  const logs = readLog();

  const totalScans = logs.length;

  // =========================
  // SCANS PER DAY
  // =========================
  const perDay = {};
  logs.forEach(r => {
    const key = dayKey(r.t);
    perDay[key] = (perDay[key] || 0) + 1;
  });

  // =========================
  // LAST 7 DAYS
  // =========================
  const last7 = Object.entries(perDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7);

  // =========================
  // GROWTH (simple)
  // =========================
  let growth = 0;
  if (last7.length >= 2) {
    const prev = last7[last7.length - 2][1];
    const curr = last7[last7.length - 1][1];

    if (prev > 0) {
      growth = ((curr - prev) / prev) * 100;
    }
  }

  // =========================
  // INGRESS TYPES
  // =========================
  const ingress = {
    TEXT: 0,
    IMAGE: 0,
    MIXED: 0
  };

  logs.forEach(r => {
    if (r.ingress === 'TEXT') ingress.TEXT++;
    else if (r.ingress === 'IMAGE') ingress.IMAGE++;
    else ingress.MIXED++;
  });

  // =========================
  // RESPONSE
  // =========================
  return res.json({
    success: true,
    data: {
      totalScans,
      scansPerDay: perDay,
      last7Days: last7,
      growthPercent: Math.round(growth),
      ingressBreakdown: ingress
    }
  });
};