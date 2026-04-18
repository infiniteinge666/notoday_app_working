'use strict';

const express = require('express');

const { checkUpload } = require('./http/middleware/checkUpload');
const httpCheckHandler = require('./http/handlers/httpCheckHandler');
const httpIntelHandler = require('./http/handlers/httpIntelHandler');
const httpInvestorHandler = require('./http/handlers/httpInvestorHandler');
const httpPaymentConfirmHandler = require('./http/handlers/httpPaymentConfirmHandler');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'OK' });
});

router.post('/check', checkUpload, httpCheckHandler);

router.get('/intel', httpIntelHandler);
router.get('/investor', httpInvestorHandler);
router.post('/payment/confirm', httpPaymentConfirmHandler);

module.exports = router;
