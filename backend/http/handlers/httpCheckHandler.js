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

function getMultipartBoundary(contentType) {
  const match = String(contentType || '').match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return match ? (match[1] || match[2] || '').trim() : '';
}

function indexOfBuffer(buffer, value, start = 0) {
  return buffer.indexOf(Buffer.from(value), start);
}

function parseMultipartImage(buffer, boundary) {
  const boundaryToken = `--${boundary}`;
  let cursor = 0;

  while (cursor < buffer.length) {
    const partStart = indexOfBuffer(buffer, boundaryToken, cursor);
    if (partStart === -1) break;

    const headersStart = partStart + Buffer.byteLength(boundaryToken) + 2;
    const headersEnd = indexOfBuffer(buffer, '\r\n\r\n', headersStart);
    if (headersEnd === -1) break;

    const headersText = buffer.slice(headersStart, headersEnd).toString('utf8');
    const contentDisposition = headersText.match(/content-disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]*)")?/i);
    const fieldName = contentDisposition ? contentDisposition[1] : '';
    const hasFilename = Boolean(contentDisposition && contentDisposition[2]);

    const dataStart = headersEnd + 4;
    const nextBoundary = indexOfBuffer(buffer, `\r\n${boundaryToken}`, dataStart);
    if (nextBoundary === -1) break;

    if (fieldName === 'image' && hasFilename) {
      return buffer.slice(dataStart, nextBoundary);
    }

    cursor = nextBoundary + 2;
  }

  return null;
}

async function readRequestBuffer(req) {
  const chunks = [];

  await new Promise((resolve, reject) => {
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', resolve);
    req.on('error', reject);
  });

  return chunks.length ? Buffer.concat(chunks) : Buffer.alloc(0);
}

async function getImageInput(req) {
  const contentType = String(req.headers['content-type'] || '');

  if (/multipart\/form-data/i.test(contentType)) {
    const boundary = getMultipartBoundary(contentType);
    if (!boundary) {
      return { imageBuffer: null, imageBase64: '' };
    }

    const bodyBuffer = await readRequestBuffer(req);
    return {
      imageBuffer: parseMultipartImage(bodyBuffer, boundary),
      imageBase64: ''
    };
  }

  return {
    imageBuffer: null,
    imageBase64: asText(req.body?.imageBase64) || asText(req.body?.image)
  };
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
    const { imageBuffer, imageBase64 } = await getImageInput(req);
    const hasImage = Boolean(imageBuffer?.length || imageBase64);

    if (!text && !hasImage) {
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

    if (hasImage) {
      ocr = await runOCR(imageBuffer || imageBase64);

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
      ingress: hasImage ? (text ? 'TEXT+IMAGE' : 'IMAGE') : 'TEXT',
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
