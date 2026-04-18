'use strict';

const { runCheck } = require('../../core/engine');
const { runOCR } = require('../../core/ocr');
const { logScan } = require('../../core/scanLogger');

const MAX_BASE64_IMAGE_BYTES = 8 * 1024 * 1024;

function isStrictBase64(value) {
  const base64 = String(value || '').replace(/\s+/g, '');
  if (!base64) return false;
  if (base64.length % 4 !== 0) return false;
  if (/[^A-Za-z0-9+/=]/.test(base64)) return false;

  const firstPaddingIndex = base64.indexOf('=');
  if (firstPaddingIndex !== -1 && firstPaddingIndex < base64.length - 2) {
    return false;
  }

  return true;
}

function decodeBase64Image(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/i);
  if (!match) return null;

  const base64 = String(match[2] || '').replace(/\s+/g, '');
  if (!isStrictBase64(base64)) return null;

  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length || buffer.length > MAX_BASE64_IMAGE_BYTES) return null;

  if (buffer.toString('base64').replace(/=+$/u, '') !== base64.replace(/=+$/u, '')) {
    return null;
  }

  return buffer;
}

function buildBoundedResponse(overrides = {}) {
  return {
    band: 'SUSPICIOUS',
    score: 50,
    degraded: true,
    reasons: ['The system could not complete this scan safely.'],
    why: ['Try a clearer screenshot or paste the message text instead.'],
    whatNotToDo: ['Do not act on the message until you verify it independently.'],
    ...overrides
  };
}

module.exports = async function httpCheckHandler(req, res) {
  try {
    const intelState = req.app.locals.intelState || {};
    const intel = intelState.intel || null;
    const degraded = Boolean(intelState.degraded);

    let ingressType = 'TEXT';
    let rawText = '';
    let imageBuffer = null;
    let ocrMeta = null;

    if (req.file && Buffer.isBuffer(req.file.buffer)) {
      ingressType = 'IMAGE';
      imageBuffer = req.file.buffer;
    } else if (req.body && req.body.imageBase64) {
      ingressType = 'IMAGE';
      imageBuffer = decodeBase64Image(req.body.imageBase64);

      if (!imageBuffer) {
        return res.status(200).json({
          success: true,
          message: 'OK',
          data: buildBoundedResponse({
            reasons: ['Image could not be processed safely.'],
            why: ['The uploaded image was invalid or too large to process.']
          })
        });
      }
    } else {
      rawText = String(req.body?.raw || req.body?.text || req.body?.input || '').trim();
    }

    if (imageBuffer) {
      let ocrResult = { success: false, text: '' };

      try {
        ocrResult = await runOCR(imageBuffer);
      } catch (error) {
        console.error('[httpCheckHandler] ocr_error', {
          message: error?.message || 'Unknown OCR error',
          stack: error?.stack || null
        });
      }

      if (!ocrResult?.success || !ocrResult?.text) {
        return res.status(200).json({
          success: true,
          message: 'OK',
          data: buildBoundedResponse({
            ingressType,
            ocr: { success: false },
            reasons: ['OCR could not reliably extract text from the image.'],
            why: ['Try a clearer screenshot or paste the text directly.']
          })
        });
      }

      rawText = String(ocrResult.text || '').trim();
      ocrMeta = {
        success: true,
        chars: rawText.length,
        excerpt: rawText.slice(0, 200)
      };
    }

    if (!rawText) {
      return res.status(200).json({
        success: true,
        message: 'OK',
        data: {
          band: 'SAFE',
          score: 0,
          ingressType,
          degraded: false,
          reasons: ['No input provided.'],
          why: ['Paste a message, email, link, or upload a screenshot to scan it.'],
          whatNotToDo: ['Never paste passwords, OTPs, PINs, or CVVs into the scanner.'],
          intelVersion: intel?.version || 'unknown'
        }
      });
    }

    if (!intel || degraded) {
      return res.status(200).json({
        success: true,
        message: 'OK',
        data: buildBoundedResponse({
          ingressType,
          reasons: ['Intel store unavailable.'],
          why: ['The system is running in degraded mode and cannot complete a reliable scan right now.'],
          ...(ocrMeta ? { ocr: ocrMeta } : {})
        })
      });
    }

    const result = runCheck(rawText, intel);

    logScan({
      ip: req.ip,
      ingress: ingressType,
      len: rawText.length
    });

    return res.status(200).json({
      success: true,
      message: 'OK',
      data: {
        ...result,
        ingressType,
        degraded: false,
        ...(ocrMeta ? { ocr: ocrMeta } : {})
      }
    });
  } catch (error) {
    return res.status(200).json({
      success: true,
      message: 'OK',
      data: buildBoundedResponse({
        reasons: ['System error while processing the scan.'],
        why: ['Please try again with different input.']
      })
    });
  }
};
