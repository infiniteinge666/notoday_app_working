'use strict';

const express = require('express');

const httpCheckHandler = require('./http/handlers/httpCheckHandler');
const httpIntelHandler = require('./http/handlers/httpIntelHandler');
const httpLogsHandler = require('./http/handlers/httpLogsHandler');

const router = express.Router();

// =========================
// HEALTH
// =========================
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'OK' });
});

// =========================
// CORE ENDPOINTS (LOCKED)
// =========================
router.get('/intel', httpIntelHandler);
router.post('/check', httpCheckHandler);

// =========================
// OPS VISIBILITY (PLANE B ONLY)
// =========================
router.get('/logs', httpLogsHandler);

// =========================
// FAIL CLOSED
// =========================
router.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    data: {
      band: 'SUSPICIOUS',
      score: 50,
      reasons: ['Unknown endpoint']
    }
  });
});

module.exports = router;