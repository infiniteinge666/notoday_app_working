'use strict';

const express = require('express');
const httpCheckHandler = require('./http/handlers/httpCheckHandler');
const httpIntelHandler = require('./http/handlers/httpIntelHandler');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'OK' });
});

router.get('/intel', httpIntelHandler);
router.post('/check', httpCheckHandler);
const httpInvestorHandler = require('./http/handlers/httpInvestorHandler');

app.get('/investor', httpInvestorHandler);
module.exports = router;