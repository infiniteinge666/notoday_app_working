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

  function setState(state) {
    document.body.className = `state-${state}`;
  }

  function showLoader(show) {
    loader.classList.toggle('hidden', !show);
  }

  function renderResult(data) {
    if (!data) return;

    const band = (data.band || 'safe').toLowerCase();
    setState(band);

    resultHeading.textContent = data.band || 'RESULT';
    resultReason.textContent =
      (data.why && data.why.length ? data.why : data.reasons || []).join(', ');
  }

  async function handleTextScan() {
    const text = input.value.trim();
    if (!text) return;

    setState('processing');
    showLoader(true);

    try {
      const res = await fetch('/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: text })
      });

      const payload = await res.json();
      renderResult(payload?.data);
    } catch (err) {
      alert('Scan failed.');
      setState('idle');
    } finally {
      showLoader(false);
    }
  }

  scanBtn.addEventListener('click', handleTextScan);

  pasteBtn.addEventListener('click', async () => {
    try {
      input.value = await navigator.clipboard.readText();
    } catch {}
  });

  uploadBtn.addEventListener('click', () => fileInput.click());

  clearBtn.addEventListener('click', () => {
    input.value = '';
    resultHeading.textContent = '';
    resultReason.textContent = '';
    setState('idle');
  });

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setState('processing');
    showLoader(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/check', {
        method: 'POST',
        body: formData
      });

      const payload = await res.json();
      renderResult(payload?.data);
    } catch {
      alert('Upload failed.');
    } finally {
      showLoader(false);
      fileInput.value = '';
    }
  });

  setState('idle');
});