"use strict";

const { runCheck } = require("../../core/engine");
const { loadIntelOrDie } = require("../../intel/loadIntel");

async function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = [];

    req.on("data", chunk => data.push(chunk));
    req.on("end", () => resolve(Buffer.concat(data)));
    req.on("error", reject);
  });
}

async function httpCheckHandler(req, res) {
  try {
    const intel = loadIntelOrDie();

    let text = "";
    let imageBuffer = null;

    const contentType = req.headers["content-type"] || "";

    // =========================
    // JSON REQUEST (TEXT / BASE64)
    // =========================
    if (contentType.includes("application/json")) {
      const { text: t, imageBase64 } = req.body || {};

      if (t) {
        text = t;
      }

      if (imageBase64) {
        imageBuffer = Buffer.from(imageBase64, "base64");
      }
    }

    // =========================
    // FORM DATA (FILE UPLOAD)
    // =========================
    else if (contentType.includes("multipart/form-data")) {
      const raw = await readRawBody(req);

      // crude extraction (no multer needed)
      const start = raw.indexOf("\r\n\r\n") + 4;
      const end = raw.lastIndexOf("\r\n------");

      if (start > 0 && end > start) {
        imageBuffer = raw.slice(start, end);
      }
    }

    // =========================
    // OCR (if image exists)
    // =========================
    if (imageBuffer) {
      const { extractTextFromImage } = require("../../core/ocr");
      text = await extractTextFromImage(imageBuffer);
    }

    if (!text) {
      return res.json({
        success: false,
        message: "No input provided",
        data: { band: "ERROR", score: 0, reasons: ["No input"] }
      });
    }

    const result = runCheck({ text, intel });

    return res.json({
      success: true,
      message: "Scan complete",
      data: result
    });

  } catch (err) {
    console.error("CHECK ERROR:", err);

    return res.json({
      success: false,
      message: "Scan failed",
      data: {
        band: "ERROR",
        score: 0,
        reasons: [err.message || "Unknown error"]
      }
    });
  }
}

module.exports = { httpCheckHandler };