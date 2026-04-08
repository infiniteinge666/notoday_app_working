'use strict';

const { runCheck } = require('../../core/engine');
const { runOCR } = require('../../core/ocr');
const { logScan } = require('../../core/scanLogger');

function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

module.exports = async function httpCheckHandler(req, res, next) {
  try {
    const text = asText(req.body?.text);
    const imageBase64 = asText(req.body?.imageBase64) || asText(req.body?.image);

    if (!text && !imageBase64) {
      return res.status(400).json({
        success: false,
        message: 'Provide text or a screenshot.'
      });
    }

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

    const intelState = req.app.locals.intelState || {};
    const intel = intelState.intel || {};

    logScan({
      ip: req.ip,
      ingress: imageBase64 ? (text ? 'TEXT+IMAGE' : 'IMAGE') : 'TEXT',
      len: combinedText.length
    });

    const data = runCheck(combinedText, intel);
    data.degraded = Boolean(intelState.degraded);

    if (ocr?.text) {
      data.ocrText = ocr.text;
    }

    return res.json({
      success: true,
      message: 'OK',
      data
    });
  } catch (err) {
    return next(err);
  }
};