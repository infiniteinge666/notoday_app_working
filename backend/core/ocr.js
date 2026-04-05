'use strict';

const Tesseract = require('tesseract.js');

let sharpModule;
let sharpLoadAttempted = false;

function getSharp() {
  if (sharpLoadAttempted) return sharpModule;
  sharpLoadAttempted = true;

  try {
    sharpModule = require('sharp');
  } catch (err) {
    sharpModule = null;
    console.warn('[notoday] sharp unavailable, OCR preprocessing disabled:', err?.message || err);
  }

  return sharpModule;
}

function normalizeInput(input) {
  if (Buffer.isBuffer(input)) return input;
  if (typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^data:image\/\w+;base64,(.+)$/i);
  const b64 = match ? match[1] : trimmed;

  try {
    return Buffer.from(b64, 'base64');
  } catch {
    return null;
  }
}

async function preprocess(buffer) {
  const sharp = getSharp();
  if (!sharp) {
    return buffer;
  }

  return sharp(buffer)
    .rotate()
    .grayscale()
    .normalize()
    .sharpen()
    .resize({ width: 1600, withoutEnlargement: true })
    .png()
    .toBuffer();
}

function cleanText(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function heuristicScore(text) {
  let score = 0;
  if (/https?:\/\//i.test(text)) score += 20;
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) score += 15;
  if (/urgent|verify|login|secure|claim|otp|password/i.test(text)) score += 20;
  score += Math.min(40, text.split(/\s+/).filter(Boolean).length);
  return score;
}

async function runOCR(input) {
  const buffer = normalizeInput(input);
  if (!buffer) {
    return { success: false, text: '', error: 'Invalid image data.' };
  }

  try {
    const prepared = await preprocess(buffer);
    const result = await Tesseract.recognize(prepared, 'eng', {
      logger: () => {}
    });

    const text = cleanText(result?.data?.text || '');
    if (!text) {
      return { success: false, text: '', error: 'No readable text found in screenshot.' };
    }

    return {
      success: true,
      text,
      score: heuristicScore(text),
      passes: [{ text, score: heuristicScore(text) }]
    };
  } catch (err) {
    return {
      success: false,
      text: '',
      error: err?.message || 'OCR failed.'
    };
  }
}

module.exports = { runOCR };