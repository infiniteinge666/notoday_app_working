'use strict';

const express = require('express');
const path = require('path');

const routes = require('./routes');
const { loadIntel } = require('./intel/loadIntel');

const app = express();
app.disable('x-powered-by');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public'), {
  index: 'index.html',
  extensions: ['html']
}));

const intelPath = path.join(__dirname, 'data', 'scamIntel.json');
const intelState = loadIntel(intelPath);
app.locals.intelState = intelState;

app.use('/', routes);

app.use((err, req, res, next) => {
  console.error('[notoday] error:', err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    success: false,
    message: err?.message || 'Internal server error',
    data: {
      band: 'ERROR',
      score: 0,
      reasons: ['The server could not complete the scan.']
    }
  });
});

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  const intel = intelState?.intel || {};
  console.log(`[notoday] listening on :${PORT}`);
  console.log(`[notoday] intel version=${intel.version || 'unknown'} degraded=${Boolean(intelState?.degraded)}`);
});