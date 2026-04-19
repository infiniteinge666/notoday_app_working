'use strict';

const fs = require('fs');
const path = require('path');

const ERROR_LOG_PATH = path.join(__dirname, '../../data/error.log');
const SCAN_LOG_PATH = path.join(__dirname, '../../data/scan.log');

function safeRead(filePath, limit = 100) {
  try {
    if (!fs.existsSync(filePath)) return [];

    const lines = fs.readFileSync(filePath, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .slice(-limit)
      .reverse();

    return lines.map((line) => {
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

function countScans(filePath) {
  try {
    if (!fs.existsSync(filePath)) return 0;
    const content = fs.readFileSync(filePath, 'utf8').trim();
    if (!content) return 0;
    return content.split('\n').filter(Boolean).length;
  } catch {
    return 0;
  }
}

function countByIngress(filePath) {
  try {
    if (!fs.existsSync(filePath)) return { TEXT: 0, IMAGE: 0 };

    const lines = fs.readFileSync(filePath, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean);

    let TEXT = 0;
    let IMAGE = 0;

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.ingress === 'TEXT') TEXT++;
        if (parsed.ingress === 'IMAGE') IMAGE++;
      } catch {}
    }

    return { TEXT, IMAGE };
  } catch {
    return { TEXT: 0, IMAGE: 0 };
  }
}

function httpLogsHandler(req, res) {
  try {
    const errors = safeRead(ERROR_LOG_PATH);
    const totalScans = countScans(SCAN_LOG_PATH);
    const ingressCounts = countByIngress(SCAN_LOG_PATH);

    return res.json({
      success: true,
      data: {
        totalScans,
        ingress: ingressCounts,
        errors,
        errorCount: errors.length
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      data: {
        totalScans: 0,
        ingress: { TEXT: 0, IMAGE: 0 },
        errors: [],
        errorCount: 0
      },
      message: 'Log retrieval failed'
    });
  }
}

module.exports = httpLogsHandler;