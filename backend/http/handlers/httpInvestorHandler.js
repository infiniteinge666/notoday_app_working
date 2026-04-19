'use strict';

const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '../../data/scan.log');

// =========================
// SAFE READ (bounded)
// =========================
function readLog(limit = 5000) {
  try {
    if (!fs.existsSync(LOG_PATH)) return [];

    const raw = fs.readFileSync(LOG_PATH, 'utf8');
    if (!raw) return [];

    const lines = raw.trim().split('\n').filter(Boolean);
    const sliced = lines.slice(-limit);

    const parsed = [];
    for (const line of sliced) {
      try {
        parsed.push(JSON.parse(line));
      } catch {
        // ignore malformed lines
      }
    }

    return parsed;
  } catch {
    return [];
  }
}

// =========================
// DATE KEY (safe)
// =========================
function dayKey(ts) {
  if (!ts) return 'unknown';

  const d = new Date(ts);
  if (isNaN(d.getTime())) return 'invalid';

  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// =========================
// BUILD PER-DAY COUNTS
// =========================
function buildPerDay(logs) {
  const perDay = {};

  for (const r of logs) {
    const key = dayKey(r.t);
    perDay[key] = (perDay[key] || 0) + 1;
  }

  return perDay;
}

// =========================
// LAST 7 DAYS (sorted)
// =========================
function buildLast7(perDay) {
  return Object.entries(perDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7);
}

// =========================
// GROWTH CALCULATION
// =========================
function calcGrowth(last7) {
  if (last7.length < 2) return 0;

  const prev = last7[last7.length - 2][1];
  const curr = last7[last7.length - 1][1];

  if (prev === 0 && curr > 0) return 100; // breakout
  if (prev > 0) return ((curr - prev) / prev) * 100;

  return 0;
}

// =========================
// INGRESS BREAKDOWN
// =========================
function buildIngress(logs) {
  const ingress = {
    TEXT: 0,
    IMAGE: 0,
    MIXED: 0
  };

  for (const r of logs) {
    if (r.ingress === 'TEXT') ingress.TEXT++;
    else if (r.ingress === 'IMAGE') ingress.IMAGE++;
    else ingress.MIXED++;
  }

  return ingress;
}

// =========================
// MAIN HANDLER
// =========================
function httpInvestorHandler(req, res) {
  try {
    const logs = readLog(5000);

    const totalScans = logs.length;

    const perDay = buildPerDay(logs);
    const last7 = buildLast7(perDay);
    const growth = calcGrowth(last7);
    const ingress = buildIngress(logs);

    const lastScanTime =
      logs.length > 0 && logs[logs.length - 1]
        ? logs[logs.length - 1].t
        : null;

    return res.json({
      success: true,
      data: {
        totalScans,
        scansPerDay: perDay,
        last7Days: last7,
        growthPercent: Math.round(growth),
        ingressBreakdown: ingress,
        lastScanTime
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      data: {
        totalScans: 0,
        scansPerDay: {},
        last7Days: [],
        growthPercent: 0,
        ingressBreakdown: { TEXT: 0, IMAGE: 0, MIXED: 0 },
        lastScanTime: null
      },
      message: 'Investor metrics failed'
    });
  }
}

module.exports = httpInvestorHandler;