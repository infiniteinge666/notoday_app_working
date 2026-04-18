'use strict';

const express = require('express');
const path = require('path');

const routes = require('./routes');
const { loadIntel } = require('./intel/loadIntel');

const app = express();
app.disable('x-powered-by');

console.log('[server] boot:start');

// Parse JSON only
app.use(express.json({ limit: '256kb' }));

// Request visibility
app.use((req, res, next) => {
  const startedAt = Date.now();

  console.log('[server] request:start', {
    method: req.method,
    path: req.originalUrl || req.url,
    ip: req.ip,
    contentType: req.headers['content-type'] || null,
    contentLength: req.headers['content-length'] || null
  });

  res.on('finish', () => {
    console.log('[server] request:end', {
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt
    });
  });

  next();
});

// Serve UI
const publicPath = path.join(__dirname, 'public');
console.log('[server] static:register', { publicPath });

app.use(express.static(publicPath, {
  extensions: ['html'],
  index: 'index.html'
}));

// Load intel at boot (validated). No runtime mutation.
const intelPath = path.join(__dirname, 'data', 'scamIntel.json');
console.log('[server] intel:boot:load:start', { intelPath });

const intelState = loadIntel(intelPath);
app.locals.intelState = intelState;

console.log('[server] intel:boot:load:end', {
  intelPath: intelState.intelPath,
  degraded: !!intelState.degraded,
  version: intelState?.intel?.version || 'unknown'
});

// Locked API surface
console.log('[server] routes:register:start', { mountPath: '/' });
app.use('/', routes);
console.log('[server] routes:register:end', { mountPath: '/' });

// Never return HTML stack traces
app.use((err, req, res, next) => {
  console.error('[server] error:global', {
    method: req?.method || null,
    path: req?.originalUrl || req?.url || null,
    message: err?.message || 'Unknown error',
    stack: err?.stack || null
  });

  res.status(200).json({
    success: true,
    data: {
      band: 'SUSPICIOUS',
      score: 50,
      reasons: ['System error (bounded).'],
      degraded: true
    },
    message: 'OK'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const intel = intelState?.intel || null;
  const version = intel?.version || 'unknown';
  const degraded = !!intelState?.degraded;

  console.log('[server] boot:complete', {
    port: PORT,
    intelPath: intelState.intelPath,
    intelVersion: version,
    degraded
  });

  console.log(`[notoday] listening on :${PORT}`);
  console.log(`[notoday] intelPath=${intelState.intelPath} version=${version} degraded=${degraded}`);
});