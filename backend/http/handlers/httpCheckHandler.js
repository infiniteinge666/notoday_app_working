"use strict";

const multer = require("multer");
const loadIntelOrDie = require("../../intel/loadIntel");

const engineModule = require("../../core/engine");
const ocrModule = require("../../core/ocr");

const runCheck =
  typeof engineModule === "function"
    ? engineModule
    : engineModule.runCheck || engineModule.scan;

const extractTextFromImage =
  typeof ocrModule === "function"
    ? ocrModule
    : ocrModule.extractTextFromImage ||
      ocrModule.extractText ||
      ocrModule.ocr ||
      null;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

function httpCheckHandler(req, res) {
  upload.single("image")(req, res, async function onUploadComplete(err) {
    try {
      if (err) {
        console.error("UPLOAD ERROR:", err);
        return res.status(400).json({
          success: false,
          message: "Upload failed",
          data: {
            band: "ERROR",
            score: 0,
            reasons: ["Upload failed"]
          }
        });
      }

      if (typeof runCheck !== "function") {
        throw new Error("runCheck is not a function");
      }

      const intel = loadIntelOrDie();

      let text = "";
      let imageBuffer = null;

      if (req.body && typeof req.body.text === "string" && req.body.text.trim()) {
        text = req.body.text.trim();
      }

      if (
        req.body &&
        typeof req.body.imageBase64 === "string" &&
        req.body.imageBase64.trim()
      ) {
        imageBuffer = Buffer.from(req.body.imageBase64.trim(), "base64");
      }

      if (req.file && req.file.buffer) {
        imageBuffer = req.file.buffer;
      }

      if (imageBuffer && typeof extractTextFromImage === "function") {
        const ocrText = await extractTextFromImage(imageBuffer);
        if (typeof ocrText === "string" && ocrText.trim()) {
          text = ocrText.trim();
        }
      }

      if (!text) {
        return res.status(400).json({
          success: false,
          message: "No input provided",
          data: {
            band: "ERROR",
            score: 0,
            reasons: ["No input"]
          }
        });
      }

      const result = runCheck({ text, intel });

      return res.json({
        success: true,
        message: "Scan complete",
        data: result
      });
    } catch (error) {
      console.error("CHECK ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Scan failed",
        data: {
          band: "ERROR",
          score: 0,
          reasons: [error && error.message ? error.message : "Unknown error"]
        }
      });
    }
  });
}

module.exports = httpCheckHandler;