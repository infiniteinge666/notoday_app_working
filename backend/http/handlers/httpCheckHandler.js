"use strict";

const multer = require("multer");
const loadIntelOrDie = require("../../intel/loadIntel");

const engineModule = require("../../core/engine");
const ocrModule = require("../../core/ocr");

// Resolve engine function safely
const runCheck =
  typeof engineModule === "function"
    ? engineModule
    : engineModule.runCheck || engineModule.scan;

// Resolve OCR function safely
const extractTextFromImage =
  typeof ocrModule === "function"
    ? ocrModule
    : ocrModule.extractTextFromImage ||
      ocrModule.extractText ||
      ocrModule.ocr ||
      null;

// Multer setup (memory storage for OCR)
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

      // TEXT INPUT
      if (req.body && typeof req.body.text === "string" && req.body.text.trim()) {
        text = req.body.text.trim();
      }

      // BASE64 INPUT (fallback path)
      if (
        req.body &&
        typeof req.body.imageBase64 === "string" &&
        req.body.imageBase64.trim()
      ) {
        try {
          imageBuffer = Buffer.from(req.body.imageBase64.trim(), "base64");
        } catch (e) {
          console.error("BASE64 PARSE ERROR:", e);
        }
      }

      // MULTER FILE INPUT (primary path)
      if (req.file && req.file.buffer) {
        imageBuffer = req.file.buffer;
      }

      // OCR PROCESSING (WITH DEBUG VISIBILITY)
      if (imageBuffer && typeof extractTextFromImage === "function") {
        console.log("OCR START — buffer size:", imageBuffer.length);

        const ocrText = await extractTextFromImage(imageBuffer);

        console.log("OCR RAW RESULT:", ocrText);
        console.log("OCR TYPE:", typeof ocrText);
        console.log("OCR LENGTH:", ocrText ? ocrText.length : 0);

        if (typeof ocrText === "string" && ocrText.trim()) {
          text = ocrText.trim();
        } else {
          console.log("OCR RETURNED EMPTY OR INVALID");
        }
      } else {
        if (!imageBuffer) {
          console.log("NO IMAGE BUFFER PROVIDED");
        }
        if (typeof extractTextFromImage !== "function") {
          console.log("OCR FUNCTION NOT RESOLVED");
        }
      }

      // FINAL VALIDATION
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