'use strict';

const Tesseract = require('tesseract.js');

const MAX_OCR_CHARS = 8000;
const OCR_TIMEOUT_MS = 12000;

async function runOCR(imageBuffer) {
  const bufferSize = Buffer.isBuffer(imageBuffer) ? imageBuffer.length : 0;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

  console.log('[ocr] start', {
    bufferSize,
    timeoutMs: OCR_TIMEOUT_MS
  });

  try {
    const result = await Tesseract.recognize(
      imageBuffer,
      'eng',
      {
        logger: () => {},
        abortSignal: controller.signal
      }
    );

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
    console.error('[ocr] error', {
      message: err?.message || 'Unknown OCR error',
      stack: err?.stack || null,
      bufferSize
    });

    return { success: false, text: '' };
  } finally {
    clearTimeout(timeout);
    console.log('[ocr] finish', {
      bufferSize
    });
  }
}

module.exports = { runOCR };