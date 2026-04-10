'use strict';

const { runCheck } = require('../../core/engine');
const { runOCR } = require('../../core/ocr');
const { logScan } = require('../../core/scanLogger');
const { checkAccess, recordUsage } = require("../../core/tokenGate");

// =========================
// SAFE TEXT
// =========================
function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// =========================
// HANDLER
// =========================
module.exports = async function httpCheckHandler(req, res, next) {
  try {

    // =========================
    // TOKEN GATE (FIRST)
    // =========================
    const access = checkAccess(req);

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: access.reason || "Access denied",
        data: {
          band: "BLOCKED",
          score: 0,
          reasons: ["Free scan limit reached"],
          explanation: ["You have reached the free usage limit. Upgrade required."]
        }
      });
    }

    // =========================
    // INPUT
    // =========================
    const text = asText(req.body?.text);
    const imageBase64 = asText(req.body?.imageBase64) || asText(req.body?.image);

    if (!text && !imageBase64) {
      return res.status(400).json({
        success: false,
        message: 'Provide text or a screenshot.'
      });
    }

    // =========================
    // OCR
    // =========================
    let ocr = null;
    let combinedText = text;

    if (imageBase64) {
      ocr = await runOCR(imageBase64);

      if (!ocr.success && !text) {
        return res.status(422).json({
          success: false,
          message: ocr.error || 'Could not read screenshot.'
        });
      }

      if (ocr.text) {
        combinedText = [text, ocr.text].filter(Boolean).join('\n');
      }
    }

    // =========================
    // INTEL
    // =========================
    const intelState = req.app.locals.intelState || {};
    const intel = intelState.intel || {};

    // =========================
    // LOG (REAL USAGE PROOF)
    // =========================
    logScan({
      ip: req.ip,
      ingress: imageBase64 ? (text ? 'TEXT+IMAGE' : 'IMAGE') : 'TEXT',
      len: combinedText.length
    });

    // =========================
    // ENGINE
    // =========================
    const data = runCheck(combinedText, intel);

    data.degraded = Boolean(intelState.degraded);

    if (ocr?.text) {
      data.ocrText = ocr.text;
    }

    // =========================
    // RECORD USAGE (ONLY AFTER SUCCESS)
    // =========================
    recordUsage(req);

    // =========================
    // RESPONSE
    // =========================
    return res.json({
      success: true,
      message: 'OK',
      data
    });

  } catch (err) {
    return next(err);
  }
};