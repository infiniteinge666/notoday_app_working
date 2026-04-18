'use strict';

let uploadSingle = null;

try {
  const multer = require('multer');

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 8 * 1024 * 1024,
      files: 1
    },
    fileFilter(req, file, cb) {
      if (!file || typeof file.mimetype !== 'string') {
        return cb(new Error('Invalid upload metadata.'));
      }

      if (!file.mimetype.toLowerCase().startsWith('image/')) {
        const error = new Error('Only image uploads are supported.');
        error.code = 'LIMIT_FILE_TYPE';
        return cb(error);
      }

      return cb(null, true);
    }
  });

  uploadSingle = upload.single('image');
} catch (error) {
  uploadSingle = null;
}

function checkUpload(req, res, next) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  const isMultipart = contentType.includes('multipart/form-data');

  if (!isMultipart) {
    return next();
  }

  if (!uploadSingle) {
    const error = new Error('Multipart upload support is unavailable because multer is not installed.');
    error.code = 'MULTER_MISSING';
    return next(error);
  }

  return uploadSingle(req, res, next);
}

module.exports = {
  checkUpload
};
