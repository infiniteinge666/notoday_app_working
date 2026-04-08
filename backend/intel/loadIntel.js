'use strict';

const fs = require('fs');

function loadIntelOrDie(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const intel = JSON.parse(raw);

    if (!intel || typeof intel !== 'object') {
      throw new Error('Invalid intel format');
    }

    return intel;

  } catch (err) {
    console.error('[INTEL LOAD FAILED]', err);
    throw new Error('Intel load failure');
  }
}

module.exports = {
  loadIntelOrDie
};