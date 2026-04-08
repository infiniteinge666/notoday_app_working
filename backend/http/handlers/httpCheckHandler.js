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
    // RUN ENGINE (SAFE)
    // =========================
    let result;

    try {
      result = runCheck({
        text,
        imageBase64,
        intel
      });
    } catch (engineErr) {
      console.error('[ENGINE ERROR]', engineErr);
      logError('engine failure');

      return res.status(500).json({
        success: false,
        message: 'Engine failure',
        data: {
          band: 'ERROR',
          score: 0,
          reasons: ['Engine failed to process input']
        }
      });
    }

    // =========================
    // RESULT VALIDATION (CRITICAL FIX)
    // =========================
    if (!result || !result.band || !Array.isArray(result.reasons)) {
      console.error('[INVALID RESULT]', result);
      logError('invalid result');

      return res.status(500).json({
        success: false,
        message: 'Invalid result',
        data: {
          band: 'ERROR',
          score: 0,
          reasons: ['Invalid engine output']
        }
      });
    }

    // =========================
    // CLASSIFICATION (SAFE NOW)
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
    console.error('[CHECK ERROR]', err);

    logError('server failure');

    return res.status(500).json({
      success: false,
      message: err.message || 'Scan failed',
      data: {
        band: 'ERROR',
        score: 0,
        reasons: [err.message || 'The system could not process the scan.']
      }
    });
  }
}

module.exports = httpCheckHandler;