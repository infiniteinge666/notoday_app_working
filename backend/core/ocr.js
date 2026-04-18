'use strict';

const Tesseract = require('tesseract.js');

const MAX_OCR_CHARS = 8000;
const OCR_TIMEOUT_MS = 12000;
const MIN_OCR_IMAGE_BYTES = 2 * 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const PNG_TRAILER = Buffer.from([0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);

function getErrorMessage(err) {
  return err?.message || String(err || 'Unknown OCR error');
}

function buildFailure(bufferSize, type, extra = {}) {
  console.error(`[ocr] ${type}`, {
    bufferSize,
    ...extra
  });

  return {
    success: false,
    text: ''
  };
}

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

async function runOCR(imageBuffer) {
  const bufferSize = Buffer.isBuffer(imageBuffer) ? imageBuffer.length : 0;
  let timeout = null;
  let worker = null;

  console.log('[ocr] start', {
    bufferSize,
    timeoutMs: OCR_TIMEOUT_MS
  });

  try {
    if (!Buffer.isBuffer(imageBuffer)) {
      return buildFailure(bufferSize, 'invalid_buffer');
    }

    if (bufferSize < MIN_OCR_IMAGE_BYTES) {
      return buildFailure(bufferSize, 'buffer_too_small', {
        minBytes: MIN_OCR_IMAGE_BYTES
      });
    }

    const imageType = detectImageType(imageBuffer);
    if (!imageType) {
      return buildFailure(bufferSize, 'invalid_magic');
    }

    try {
      worker = await Tesseract.createWorker('eng', 1, {
        logger: () => {},
        errorHandler: (err) => {
          console.error('[ocr] worker_error', {
            message: getErrorMessage(err),
            bufferSize
          });
        }
      });
    } catch (err) {
      return buildFailure(bufferSize, 'worker_init_error', {
        message: getErrorMessage(err),
        stack: err?.stack || null
      });
    }

    const timeoutPromise = new Promise((resolve) => {
      timeout = setTimeout(() => {
        resolve({ type: 'timeout' });
      }, OCR_TIMEOUT_MS);
    });

    const recognizePromise = Promise.resolve()
      .then(() => worker.recognize(imageBuffer))
      .then((result) => ({ type: 'result', result }))
      .catch((err) => ({ type: 'error', err }));

    const outcome = await Promise.race([
      recognizePromise,
      timeoutPromise
    ]);

    if (!outcome || outcome.type === 'timeout') {
      return buildFailure(bufferSize, 'timeout', {
        imageType,
        timeoutMs: OCR_TIMEOUT_MS
      });
    }

    if (outcome.type === 'error') {
      return buildFailure(bufferSize, 'error', {
        imageType,
        message: getErrorMessage(outcome.err),
        stack: outcome.err?.stack || null
      });
    }

    const result = outcome.result;

    let text = (result.data.text || '').trim();

    console.log('[ocr] raw_output', {
      rawLength: text.length,
      preview: text.slice(0, 300)
    });

    if (!text) {
      console.error('[ocr] empty_output', {
        bufferSize
      });

      return { success: false, text: '' };
    }

    if (text.length > MAX_OCR_CHARS) {
      console.log('[ocr] truncate', {
        originalLength: text.length,
        maxLength: MAX_OCR_CHARS
      });

      text = text.slice(0, MAX_OCR_CHARS);
    }

    console.log('[ocr] success', {
      finalLength: text.length
    });

    return {
      success: true,
      text
    };
  } catch (err) {
    return buildFailure(bufferSize, 'unexpected_error', {
      message: getErrorMessage(err),
      stack: err?.stack || null
    });
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }

    if (worker) {
      try {
        await worker.terminate();
      } catch (err) {
        console.error('[ocr] terminate_error', {
          message: getErrorMessage(err),
          bufferSize
        });
      }
    }

    console.log('[ocr] finish', {
      bufferSize
    });
  }
}

module.exports = { runOCR };
