'use strict';

const express = require('express');
const path = require('path');

const routes = require('./routes');
const { loadIntel } = require('./intel/loadIntel');

const app = express();
app.disable('x-powered-by');

app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));

app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    console.log('[server] request', {
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt
    });
  });

  next();
});

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath, {
  extensions: ['html'],
  index: 'index.html'
}));

const intelPath = path.join(__dirname, 'data', 'scamIntel.json');
const intelState = loadIntel(intelPath);
app.locals.intelState = intelState;

app.use('/', routes);

app.use((err, req, res, next) => {
  if (!err) {
    return next();
  }

  const uploadCode = err.code || '';
  if (uploadCode === 'LIMIT_FILE_SIZE' || uploadCode === 'LIMIT_FILE_TYPE' || uploadCode === 'MULTER_MISSING') {
    const uploadMessage =
      uploadCode === 'LIMIT_FILE_SIZE'
        ? 'Uploaded image is too large.'
        : uploadCode === 'LIMIT_FILE_TYPE'
          ? 'Only image uploads are supported.'
          : 'Image upload support is unavailable on this server.';

    return res.status(200).json({
      success: true,
      message: 'OK',
      data: {
        band: 'SUSPICIOUS',
        score: 50,
        degraded: uploadCode === 'MULTER_MISSING',
        reasons: [uploadMessage],
        why: ['Try uploading a smaller image or paste the text directly.'],
        whatNotToDo: ['Do not act on the message until you verify it independently.']
      }
    });
  }

  console.error('[server] error', {
    method: req?.method || null,
    path: req?.originalUrl || req?.url || null,
    message: err?.message || 'Unknown error',
    stack: err?.stack || null
  });

  return res.status(200).json({
    success: true,
    message: 'OK',
    data: {
      band: 'SUSPICIOUS',
      score: 50,
      degraded: true,
      reasons: ['System error (bounded).'],
      why: ['Please try again shortly.'],
      whatNotToDo: ['Do not act on the message until you verify it independently.']
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('[notoday] listening', {
    port: PORT,
    intelPath: intelState.intelPath,
    intelVersion: intelState?.intel?.version || 'unknown',
    degraded: Boolean(intelState?.degraded)
  });
});

module.exports = app;
