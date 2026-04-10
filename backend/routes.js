'use strict';

const express = require('express');

const httpCheckHandler = require('./http/handlers/httpCheckHandler');
const httpIntelHandler = require('./http/handlers/httpIntelHandler');
const httpInvestorHandler = require('./http/handlers/httpInvestorHandler');

const router = express.Router();

// =========================
// HEALTH
// =========================
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'OK' });
});

// =========================
// CORE ROUTES
// =========================
router.get('/intel', httpIntelHandler);
router.post('/check', httpCheckHandler);

// =========================
// INVESTOR METRICS (FIXED)
// =========================
router.get('/investor', httpInvestorHandler);
