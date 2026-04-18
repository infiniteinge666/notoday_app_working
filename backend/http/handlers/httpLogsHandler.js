'use strict';
function httpLogsHandler(req, res) {
  try {
    const fs = require('fs');
    const path = require('path');
    const ERROR_LOG_PATH = path.join(__dirname, '../../data/error.log');

    function safeRead(filePath, limit = 100) {
      try {
        if (!fs.existsSync(filePath)) return [];

        const lines = fs.readFileSync(filePath, 'utf8')
          .trim()
          .split('\n')
          .filter(Boolean)
          .slice(-limit)
          .reverse();

        return lines.map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        }).filter(Boolean);
      } catch {
        return [];
      }
    }

    const scans = Array.isArray(req?.app?.locals?.scans)
      ? req.app.locals.scans
      : [];
    const errors = safeRead(ERROR_LOG_PATH);

    return res.json({
      success: true,
      data: {
        scans,
        errors
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      data: {
        scans: [],
        errors: []
      },
      message: 'Log retrieval failed'
    });
  }
}

module.exports = httpLogsHandler;
