window.addEventListener('load', () => {
  const $ = (id) => document.getElementById(id);

  const scanBtn = $('scanBtn');
  const input = $('scanInput');
  const resultHeading = $('resultHeading');
  const resultReason = $('resultReason');
  const pasteBtn = $('pasteBtn');
  const uploadBtn = $('uploadBtn');
  const clearBtn = $('clearBtn');
  const fileInput = $('fileInput');
  const loader = $('loaderOverlay');
  const resultBox = $('resultBox');

  /* =========================
     STATE NORMALIZATION
  ========================= */
  function normalizeState(state) {
    if (!state) return "safe";

    const s = state.toLowerCase();

    if (s.includes("safe")) return "safe";
    if (s.includes("suspicious")) return "suspicious";
    if (s.includes("critical")) return "critical";

    return "safe";
  }

  /* =========================
     STATE SETTER (RESULT LAYER)
  ========================= */
  function setState(state) {
    resultBox.setAttribute("data-state", state);
  }

  /* =========================
     LOADER
  ========================= */
  function showLoader(show) {
    loader.classList.toggle('hidden', !show);
  }

  /* =========================
     RENDER RESULT
  ========================= */
  function renderResult(data) {
    const normalized = normalizeState(data?.band);

    setState(normalized);

    // Display original label (SAFE / SUSPICIOUS / CRITICAL)
    resultHeading.textContent = data?.band || 'RESULT';

    const reasons =
      (data?.why?.length ? data.why : data?.reasons) || [];

    resultReason.textContent =
      reasons.length ? reasons.join(', ') : 'No details available.';
  }

  /* =========================
     SCAN HANDLER
  ========================= */
  async function handleScan(body, isForm = false) {
    setState('processing');
    showLoader(true);

    try {
      const res = await fetch('/check', {
        method: 'POST',
        headers: isForm ? undefined : { 'Content-Type': 'application/json' },
        body
      });

      const payload = await res.json();
      renderResult(payload?.data);

    } catch {
      alert('Scan failed.');
      setState('idle');
    } finally {
      showLoader(false);
    }
  }

  /* =========================
     EVENTS
  ========================= */

  scanBtn.onclick = () => {
    const text = input.value.trim();
    if (!text) return;

    handleScan(JSON.stringify({ raw: text }));
  };

  pasteBtn.onclick = async () => {
    try {
      input.value = await navigator.clipboard.readText();
    } catch {}
  };

  uploadBtn.onclick = () => fileInput.click();

  clearBtn.onclick = () => {
    input.value = '';
    resultHeading.textContent = '';
    resultReason.textContent = '';

    setState('idle');
  };

  fileInput.onchange = () => {
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    handleScan(formData, true);
    fileInput.value = '';
  };

  /* =========================
     INIT
  ========================= */
  setState('idle');
});