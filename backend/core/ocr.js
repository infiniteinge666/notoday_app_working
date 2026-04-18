'use strict';

const Tesseract = require('tesseract.js');

const MAX_OCR_CHARS = 8000;
const OCR_TIMEOUT_MS = 12000;
const MIN_OCR_IMAGE_BYTES = 2 * 1024;

// PNG signature + trailer
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const PNG_TRAILER = Buffer.from([0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);

function getErrorMessage(err) {
  return err?.message || String(err || 'Unknown OCR error');
}

// =========================
// IMAGE VALIDATION
// =========================

function isJpegBuffer(buffer) {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0xFF &&
    buffer[1] === 0xD8 &&
    buffer[buffer.length - 2] === 0xFF &&
    buffer[buffer.length - 1] === 0xD9
  );
}

function isPngBuffer(buffer) {
  return (
    buffer.length >= 16 &&
    buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE) &&
    buffer.subarray(buffer.length - PNG_TRAILER.length).equals(PNG_TRAILER)
  );
}

function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  if (isJpegBuffer(buffer)) return 'jpeg';
  if (isPngBuffer(buffer)) return 'png';
  return null;
}

// =========================
// SAFE OCR EXECUTION
// =========================

async function runOCR(imageBuffer) {
  const bufferSize = Buffer.isBuffer(imageBuffer) ? imageBuffer.length : 0;

  console.log('[ocr] start', {
    bufferSize,
    timeoutMs: OCR_TIMEOUT_MS
  });

  // 🔒 HARD FAIL EARLY
  if (!Buffer.isBuffer(imageBuffer)) {
    console.warn('[ocr] invalid_buffer');
    return { success: false, text: '' };
  }

  if (bufferSize < MIN_OCR_IMAGE_BYTES) {
    console.warn('[ocr] buffer_too_small', { bufferSize });
    return { success: false, text: '' };
  }

  const imageType = detectImageType(imageBuffer);
  if (!imageType) {
    console.warn('[ocr] invalid_magic');
    return { success: false, text: '' };
  }

  let worker = null;
  let timeout = null;

  try {
    // 🔒 CREATE WORKER SAFELY
    worker = await Tesseract.createWorker('eng', 1, {
      logger: () => {},
      errorHandler: (err) => {
        console.error('[ocr] worker_error', {
          message: getErrorMessage(err),
          bufferSize
        });
      }
    });

    // 🔒 TIMEOUT PROTECTION
    const timeoutPromise = new Promise((resolve) => {
      timeout = setTimeout(() => {
        resolve({ type: 'timeout' });
      }, OCR_TIMEOUT_MS);
    });

    // 🔒 WRAP RECOGNIZE — NEVER THROW
    const recognizePromise = Promise.resolve()
      .then(() => worker.recognize(imageBuffer))
      .then((result) => ({ type: 'result', result }))
      .catch((err) => {
        console.error('[ocr] recognize_error', {
          message: getErrorMessage(err),
          stack: err?.stack || null
        });
        return { type: 'error' };
      });

    const outcome = await Promise.race([
      recognizePromise,
      timeoutPromise
    ]);

    // 🔒 HANDLE OUTCOME SAFELY
    if (!outcome || outcome.type === 'timeout') {
      console.warn('[ocr] timeout');
      return { success: false, text: '' };
    }

    if (outcome.type === 'error') {
      return { success: false, text: '' };
    }

    const rawText = outcome.result?.data?.text || '';
    let text = rawText.trim();

    if (!text) {
      console.warn('[ocr] empty_output');
      return { success: false, text: '' };
    }

    if (text.length > MAX_OCR_CHARS) {
      text = text.slice(0, MAX_OCR_CHARS);
    }

    console.log('[ocr] success', {
      length: text.length
    });

    return {
      success: true,
      text
    };

  } catch (err) {
    // 🔒 FINAL CONTAINMENT (NEVER THROW)
    console.error('[ocr] unexpected_error', {
      message: getErrorMessage(err),
      stack: err?.stack || null
    });

    return { success: false, text: '' };

  } finally {
    if (timeout) clearTimeout(timeout);

    if (worker) {
      try {
        await worker.terminate();
      } catch (err) {
        console.error('[ocr] terminate_error', {
          message: getErrorMessage(err)
        });
      }
    }

    console.log('[ocr] finish', {
      bufferSize
    });
  }
}

// =========================
// EXPORT
// =========================

module.exports = {
  runOCR
};