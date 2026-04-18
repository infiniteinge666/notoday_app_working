"use strict";

const multer = require("multer");
const upload = multer();

const { runCheck } = require("../../core/engine");
const { loadIntelOrDie } = require("../../intel/loadIntel");
const { extractTextFromImage } = require("../../core/ocr");

// middleware wrapper
const uploadMiddleware = upload.single("image");

function httpCheckHandler(req, res) {
  uploadMiddleware(req, res, async function (err) {
    try {
      if (err) {
        console.error("Upload error:", err);
        return res.json({
          success: false,
          message: "Upload failed",
          data: { band: "ERROR", score: 0, reasons: ["Upload error"] }
        });
      }

      const intel = loadIntelOrDie();

      let text = "";

      // =========================
      // TEXT INPUT
      // =========================
      if (req.body && req.body.text) {
        text = req.body.text;
      }

      // =========================
      // IMAGE INPUT
      // =========================
      if (req.file && req.file.buffer) {
        text = await extractTextFromImage(req.file.buffer);
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
  });
}

module.exports = { httpCheckHandler };