'use strict';

const path = require('path');

const { loadIntelOrDie } = require('../../intel/loadIntel');
const { runCheck } = require('../../core/engine');

const { logScan, logError } = require('../../core/logger');
const { classifyScam } = require('../../core/classifier');

const intelPath = path.join(__dirname, '../../data/scamIntel.json');

async function httpCheckHandler(req, res) {
  try {
    const intel = loadIntelOrDie(intelPath);

    const { text, imageBase64 } = req.body || {};

    // =========================
    // VALIDATION
    // =========================
    if (!text && !imageBase64) {
      logError('no input');
    }

    if (imageBase64 && typeof imageBase64 !== 'string') {
      logError('couldnt read');
    }

    if (text && text.length > 5000) {
      logError('breach attempt');
    }

    // =========================
    // RUN ENGINE
    // =========================
    const result = runCheck({
      text,
      imageBase64,
      intel
    });

    // =========================
    // CLASSIFICATION
    // =========================
    const scamClass = classifyScam(result.reasons);

    let ingress = 'text';
    if (imageBase64) ingress = 'image';

    // =========================
    // LOGGING
    // =========================
    logScan({
      band: result.band,
      scamClass,
      ingress
    });

    // =========================
    // RESPONSE
    // =========================
    return res.json({
      success: true,
      data: result
    });

  } catch (err) {
    console.error('[notoday] check error:', err);

    logError('server failure');

    return res.status(500).json({
      success: false,
      message: 'Scan failed',
      data: {
        band: 'ERROR',
        score: 0,
        reasons: ['The system could not process the scan.']
      }
    });
  }
}

module.exports = httpCheckHandler;