'use strict';

const body = document.body;

const input = document.getElementById('input');
const scanBtn = document.getElementById('scanBtn');
const clearBtn = document.getElementById('clearBtn');
const pasteBtn = document.getElementById('pasteBtn');
const uploadBtn = document.getElementById('uploadBtn');
const imageInput = document.getElementById('imageInput');
const intelBtn = document.getElementById('intelBtn');

const statusChip = document.getElementById('statusChip');
const statusText = document.getElementById('statusText');

const resultPanel = document.getElementById('resultPanel');
const bandEl = document.getElementById('band');
const scoreEl = document.getElementById('score');
const hintEl = document.getElementById('hint');
const reasonEl = document.getElementById('reason');

const inputOverlay = document.getElementById('inputOverlay');
const fileNameEl = document.getElementById('fileName');

const STATES = Object.freeze({
  IDLE: 'state-idle',
  SCANNING: 'state-scanning',
  SAFE: 'state-safe',
  SUSPICIOUS: 'state-suspicious',
  CRITICAL: 'state-critical'
});

let selectedImageBase64 = '';
let selectedImageName = '';

const clickSound = new Audio('/assets/click.mp3');
clickSound.preload = 'auto';
clickSound.volume = 0.18;

function playClick() {
  clickSound.currentTime = 0;
  clickSound.play().catch(() => {});
}

function setUiState(stateClass) {
  body.classList.remove(
    STATES.IDLE,
    STATES.SCANNING,
    STATES.SAFE,
    STATES.SUSPICIOUS,
    STATES.CRITICAL
  );
  body.classList.add(stateClass);
}

function setStatus(chip, text) {
  statusChip.textContent = chip;
  statusText.textContent = text;
}

function normalizeBand(value) {
  const band = String(value || '').trim().toUpperCase();

  if (band === 'SAFE') return 'SAFE';
  if (band === 'CRITICAL') return 'CRITICAL';
  return 'SUSPICIOUS';
}

function stateFromBand(band) {
  if (band === 'SAFE') return STATES.SAFE;
  if (band === 'CRITICAL') return STATES.CRITICAL;
  return STATES.SUSPICIOUS;
}

function pickPrimaryMessage(payload) {
  const reasons = Array.isArray(payload?.data?.reasons) ? payload.data.reasons : [];
  const why = Array.isArray(payload?.data?.why) ? payload.data.why : [];
  const whatNotToDo = Array.isArray(payload?.data?.whatNotToDo)
    ? payload.data.whatNotToDo
    : [];

  return (
    reasons[0] ||
    why[0] ||
    whatNotToDo[0] ||
    'No additional explanation was returned.'
  );
}

function pickSecondaryMessage(payload, band) {
  const reasons = Array.isArray(payload?.data?.reasons) ? payload.data.reasons : [];
  const why = Array.isArray(payload?.data?.why) ? payload.data.why : [];
  const whatNotToDo = Array.isArray(payload?.data?.whatNotToDo)
    ? payload.data.whatNotToDo
    : [];

  const combined = [...why, ...whatNotToDo, ...reasons].filter(Boolean);

  if (combined.length >= 2) {
    return combined[1];
  }

  if (band === 'CRITICAL') {
    return 'Do not continue, do not send money, and verify through a fresh trusted channel.';
  }

  if (band === 'SUSPICIOUS') {
    return 'Pause first. Verify the sender, the link, and the payment details independently.';
  }

  return 'Stay cautious if payment, identity, or urgency is involved.';
}

function showResult(payload) {
  const data = payload?.data || {};
  const band = normalizeBand(data.band);
  const score = Number.isFinite(Number(data.score)) ? Number(data.score) : 0;

  bandEl.textContent = band;
  scoreEl.textContent = `${score} / 100`;
  hintEl.textContent = pickPrimaryMessage(payload);
  reasonEl.textContent = pickSecondaryMessage(payload, band);

  resultPanel.hidden = false;

  setUiState(stateFromBand(band));

  if (band === 'SAFE') {
    setStatus('SAFE', 'No high-confidence scam indicators were detected.');
  } else if (band === 'CRITICAL') {
    setStatus('CRITICAL', 'High-risk indicators were detected. Stop and verify.');
  } else {
    setStatus('WARNING', 'Risk markers were detected. Verify independently.');
  }
}

function hideResult() {
  resultPanel.hidden = true;
  bandEl.textContent = 'SAFE';
  scoreEl.textContent = '0 / 100';
  hintEl.textContent = 'No high-confidence scam indicators detected.';
  reasonEl.textContent =
    'You can still verify independently if money or identity is involved.';
}

function resetToIdle() {
  setUiState(STATES.IDLE);
  hideResult();
  setStatus('READY', 'Paste text or upload a screenshot to run a check.');
}

function showSelectedImage(name) {
  inputOverlay.hidden = false;
  fileNameEl.textContent = name || 'Image selected';
  setStatus('SCREENSHOT', 'Screenshot selected. Tap Scan Now to analyse it.');
}

function clearSelectedImage() {
  selectedImageBase64 = '';
  selectedImageName = '';
  imageInput.value = '';
  inputOverlay.hidden = true;
}

async function readFileAsBase64(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });

  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) {
    throw new Error('Invalid image data.');
  }

  return dataUrl.slice(commaIndex + 1);
}

async function fetchJson(url, options) {
  try {
    const response = await fetch(url, options);
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const rawText = await response.text();

    if (!contentType.includes('application/json')) {
      return {
        ok: false,
        status: response.status,
        json: null
      };
    }

    let json = null;
    try {
      json = JSON.parse(rawText);
    } catch {
      return {
        ok: false,
        status: response.status,
        json: null
      };
    }

    return {
      ok: response.ok,
      status: response.status,
      json
    };
  } catch {
    return {
      ok: false,
      status: 0,
      json: null
    };
  }
}

function buildRequestBody() {
  const raw = String(input.value || '').trim();

  if (selectedImageBase64) {
    return {
      imageBase64: selectedImageBase64,
      deviceTokenHash: 'web'
    };
  }

  return {
    raw,
    deviceTokenHash: 'web'
  };
}

function hasSomethingToScan() {
  return Boolean(String(input.value || '').trim()) || Boolean(selectedImageBase64);
}

async function runScan() {
  if (!hasSomethingToScan()) {
    resetToIdle();
    setStatus('EMPTY', 'Paste text or choose a screenshot first.');
    input.focus();
    return;
  }

  setUiState(STATES.SCANNING);
  hideResult();
  setStatus('SCANNING', 'Running deterministic risk check...');
  scanBtn.disabled = true;
  scanBtn.querySelector('.btn-label').textContent = 'Scanning...';

  const requestBody = buildRequestBody();

  const { ok, json } = await fetchJson('/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  scanBtn.disabled = false;
  scanBtn.querySelector('.btn-label').textContent = 'Scan Now';

  if (!ok || !json) {
    setUiState(STATES.SUSPICIOUS);
    resultPanel.hidden = false;
    bandEl.textContent = 'SUSPICIOUS';
    scoreEl.textContent = '50 / 100';
    hintEl.textContent = 'Scan failed. The app did not get a valid result.';
    reasonEl.textContent = 'Try again. If the problem keeps happening, verify manually first.';
    setStatus('ERROR', 'The scan failed. No result could be trusted.');
    return;
  }

  showResult(json);
}

function clearAll() {
  input.value = '';
  clearSelectedImage();
  resetToIdle();
  input.focus();
}

async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) {
      setStatus('EMPTY', 'Clipboard is empty.');
      return;
    }

    clearSelectedImage();
    input.value = text;
    setStatus('PASTED', 'Clipboard text pasted. Tap Scan Now to analyse it.');
  } catch {
    setStatus('PASTE BLOCKED', 'Clipboard access was blocked. Paste manually into the text box.');
  }
}

async function handleImageSelection(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const base64 = await readFileAsBase64(file);
    selectedImageBase64 = base64;
    selectedImageName = file.name || 'Screenshot selected';
    input.value = '';
    hideResult();
    setUiState(STATES.IDLE);
    showSelectedImage(selectedImageName);
  } catch {
    clearSelectedImage();
    setStatus('IMAGE ERROR', 'That screenshot could not be read.');
  }
}

scanBtn.addEventListener('click', () => {
  playClick();
  runScan();
});

clearBtn.addEventListener('click', () => {
  playClick();
  clearAll();
});

pasteBtn.addEventListener('click', () => {
  playClick();
  handlePaste();
});

uploadBtn.addEventListener('click', () => {
  playClick();
  imageInput.click();
});

imageInput.addEventListener('change', handleImageSelection);

intelBtn.addEventListener('click', () => {
  playClick();
  window.open('/intel', '_blank', 'noopener');
});

input.addEventListener('input', () => {
  if (selectedImageBase64 && String(input.value || '').trim()) {
    clearSelectedImage();
  }

  if (!String(input.value || '').trim() && !selectedImageBase64) {
    resetToIdle();
    return;
  }

  hideResult();
  setUiState(STATES.IDLE);
  setStatus('READY', 'Tap Scan Now when you are ready.');
});

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    playClick();
    runScan();
  }
});

resetToIdle();