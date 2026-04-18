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

  function setState(state) {
    document.body.className = `state-${state}`;
  }

  function renderResult(data) {
    if (!data) return;

    const band = String(data.band || 'SAFE').toLowerCase();
    setState(band);
    resultHeading.textContent = data.band || 'RESULT';
    resultReason.textContent = (data.why && data.why.length ? data.why : data.reasons || []).join(', ');
  }

  async function handleTextScan() {
    const text = input.value.trim();
    if (!text) return;

    setState('processing');

    try {
      const res = await fetch('/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: text })
      });

      const payload = await res.json();
      renderResult(payload?.data);
    } catch (error) {
      console.error('TEXT ERROR:', error);
      setState('idle');
      alert('Scan failed.');
    }
  }

  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('Image too large.');
      fileInput.value = '';
      return;
    }

    setState('processing');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/check', {
        method: 'POST',
        body: formData
      });

      const payload = await res.json();
      renderResult(payload?.data);
    } catch (error) {
      console.error('UPLOAD ERROR:', error);
      setState('idle');
      alert('Upload failed.');
    }

    fileInput.value = '';
  });

  scanBtn.addEventListener('click', handleTextScan);

  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      input.value = text;
    } catch (error) {
      console.error('Paste failed:', error);
    }
  });

  uploadBtn.addEventListener('click', () => {
    fileInput.click();
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    fileInput.value = '';
    resultHeading.textContent = '';
    resultReason.textContent = '';
    setState('idle');
  });

  setState('idle');
});
