'use strict';

const express = require('express');

const httpCheckHandler = require('./http/handlers/httpCheckHandler');
const httpIntelHandler = require('./http/handlers/httpIntelHandler');
const httpInvestorHandler = require('./http/handlers/httpInvestorHandler');
const httpPaymentConfirmHandler = require('./http/handlers/httpPaymentConfirmHandler');

const router = express.Router();

// =========================
// HEALTH
// =========================
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'OK' });
});

// =========================
// CORE
// =========================
router.get('/intel', httpIntelHandler);
router.post('/check', httpCheckHandler);

// =========================
// INVESTOR
// =========================
router.get('/investor', httpInvestorHandler);

// =========================
// PAYMENT CONFIRM
// =========================
router.post('/payment/confirm', httpPaymentConfirmHandler);

module.exports = router;