'use strict';

const { runCheck } = require('../../core/engine');
const { runOCR } = require('../../core/ocr');

function decodeBase64Image(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i);
  if (!match) return null;

  const buffer = Buffer.from(match[3], 'base64');
  if (buffer.length > 2 * 1024 * 1024) return null; // 2MB limit (hard)

  return buffer;
}

module.exports = async function httpCheckHandler(req, res) {
  try {
    const bodyKeys = req && req.body && typeof req.body === 'object' ? Object.keys(req.body) : [];
    const filePresent = !!(req && req.file);
    const fileSize = req?.file?.size || null;

    console.log('[httpCheckHandler] request:start', {
      bodyKeys,
      filePresent,
      fileSize
    });

    // Intel is loaded ONCE at boot in server.js and stored here
    const intelState = req.app.locals.intelState || {};
    const intel = intelState.intel || null;
    const degraded = !!intelState.degraded;

    console.log('[httpCheckHandler] intel:state', {
      degraded,
      version: intel?.version || 'unknown'
    });

    let rawText = '';
    let ingressType = 'TEXT';
    let ocrMeta = null;

    // IMAGE path (base64 data URL)
    if (req.body && req.body.imageBase64) {
      ingressType = 'IMAGE';

      const imageBuffer = decodeBase64Image(req.body.imageBase64);

      console.log('[httpCheckHandler] image:received', {
        hasImageBase64: true,
        decoded: !!imageBuffer,
        decodedSize: imageBuffer ? imageBuffer.length : 0
      });

      if (!imageBuffer) {
        console.error('[httpCheckHandler] image:decode:failed', {
          reason: 'invalid_or_too_large'
        });

        return res.status(200).json({
          success: true,
          data: {
            band: 'SUSPICIOUS',
            score: 50,
            ingressType,
            degraded: true,
            ocr: { success: false },
            reasons: ['Image could not be processed safely (invalid/too large).'],
            explanation: [
              'The image could not be processed safely.',
              'Try uploading a clearer screenshot or paste the text instead.'
            ]
          },
          message: 'OK'
        });
      }

      console.log('[httpCheckHandler] ocr:start', {
        bufferSize: imageBuffer.length
      });

      const ocrResult = await runOCR(imageBuffer);

      console.log('[httpCheckHandler] ocr:end', {
        success: !!ocrResult?.success,
        textLength: ocrResult?.text ? String(ocrResult.text).length : 0
      });

      if (!ocrResult.success || !ocrResult.text) {
        console.error('[httpCheckHandler] ocr:failed', {
          success: !!ocrResult?.success,
          textLength: ocrResult?.text ? String(ocrResult.text).length : 0
        });

        return res.status(200).json({
          success: true,
          data: {
            band: 'SUSPICIOUS',
            score: 50,
            ingressType,
            degraded: true,
            ocr: { success: false },
            reasons: ['OCR could not reliably extract text.'],
            explanation: [
              'We could not reliably read text from this image.',
              'Try a clearer screenshot or paste the message text.'
            ]
          },
          message: 'OK'
        });
      }

      rawText = String(ocrResult.text || '').trim();
      ocrMeta = {
        success: true,
        chars: rawText.length,
        excerpt: rawText.slice(0, 200)
      };
    } else {
      // TEXT path
      rawText = (req.body && req.body.raw) ? String(req.body.raw) : '';
      rawText = rawText.trim();
    }

    console.log('[httpCheckHandler] resolved:text', {
      ingressType,
      textLength: rawText.length,
      preview: rawText.slice(0, 200)
    });

    // Empty input -> bounded safe response (no scan)
    if (!rawText) {
      console.log('[httpCheckHandler] early:return:empty_input', {
        ingressType
      });

      return res.status(200).json({
        success: true,
        data: {
          band: 'SAFE',
          score: 0,
          ingressType,
          degraded: false,
          reasons: ['No input provided.'],
          why: ['Paste a message, link, or email to scan.'],
          whatNotToDo: ['Never paste OTPs / PINs / CVV.'],
          intelVersion: intel?.version || 'unknown'
        },
        message: 'OK'
      });
    }

    // Fail-closed if intel is unavailable or degraded
    if (!intel || degraded) {
      console.error('[httpCheckHandler] early:return:degraded_mode', {
        hasIntel: !!intel,
        degraded,
        ingressType
      });

      return res.status(200).json({
        success: true,
        data: {
          band: 'SUSPICIOUS',
          score: 50,
          ingressType,
          degraded: true,
          reasons: ['Intel store unavailable (degraded mode).'],
          explanation: [
            'The system is running in degraded mode and cannot complete a reliable scan right now.',
            'Please try again shortly.'
          ],
          ...(ocrMeta ? { ocr: ocrMeta } : {})
        },
        message: 'OK'
      });
    }

    console.log('[httpCheckHandler] engine:start', {
      ingressType,
      textLength: rawText.length,
      intelVersion: intel?.version || 'unknown'
    });

    // Run scan
    const result = runCheck(rawText, intel);

    console.log('[httpCheckHandler] engine:end', {
      ingressType,
      band: result?.band || null,
      score: result?.score || 0,
      reasonsCount: Array.isArray(result?.reasons) ? result.reasons.length : 0
    });

    return res.status(200).json({
      success: true,
      data: {
        ...result,
        ingressType,
        degraded: false,
        ...(ocrMeta ? { ocr: ocrMeta } : {})
      },
      message: 'OK'
    });

  } catch (err) {
    console.error('[httpCheckHandler] request:failed', {
      message: err?.message || 'Unknown error',
      stack: err?.stack || null
    });

    // Bounded failure response (never HTML)
    return res.status(200).json({
      success: true,
      data: {
        band: 'SUSPICIOUS',
        score: 50,
        degraded: true,
        reasons: ['System error (bounded).'],
        explanation: [
          'The system could not complete this scan safely.',
          'Please try again with different input.'
        ]
      },
      message: 'OK'
    });
  }
};