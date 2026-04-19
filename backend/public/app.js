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
  document.body.classList.remove(
    'state-idle',
    'state-processing',
    'state-safe',
    'state-warning',
    'state-danger'
  );

  document.body.classList.add(`state-${state}`);
}

  function showLoader(show) {
    loader.classList.toggle('hidden', !show);
  }

  function renderResult(data) {
    const band = (data?.band || 'safe').toLowerCase();
    setState(band);

    resultHeading.textContent = data?.band || 'RESULT';

    const reasons =
      (data?.why?.length ? data.why : data?.reasons) || [];

    resultReason.textContent =
      reasons.length ? reasons.join(', ') : 'No details available.';
  }

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

  scanBtn.onclick = () => {
    const text = input.value.trim();
    if (!text) return;
    handleScan(JSON.stringify({ raw: text }));
  };

  pasteBtn.onclick = async () => {
    try { input.value = await navigator.clipboard.readText(); } catch {}
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

  setState('idle');
});