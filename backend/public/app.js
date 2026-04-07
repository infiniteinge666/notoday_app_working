window.addEventListener("load", () => {

  const $ = (id) => document.getElementById(id);

  const scanBtn = $("scanBtn");
  const input = $("scanInput");

  const resultHeading = $("resultHeading");
  const resultReason = $("resultReason");

  const pasteBtn = $("pasteBtn");
  const uploadBtn = $("uploadBtn");
  const clearBtn = $("clearBtn");
  const fileInput = $("fileInput");

  const scanLogEl = $("scanLog");
  const errorLogEl = $("errorLog");

  const loader = $("loaderOverlay");

  const MAX_LOG = 10;

  // =========================
  // STATE
  // =========================
  function setState(state) {
    document.body.className = `state-${state}`;
  }

  // =========================
  // TIME
  // =========================
  function now() {
    return new Date().toLocaleTimeString();
  }

  // =========================
  // CLASSIFIER
  // =========================
  function classify(data) {
    const text = (data.reasons || []).join(" ").toLowerCase();

    if (/otp|pin|cvv/.test(text)) return "Credential Theft";
    if (/bank|payment/.test(text)) return "Payment Fraud";
    if (/investment|crypto/.test(text)) return "Investment Scam";
    if (/parcel|delivery/.test(text)) return "Delivery Scam";
    if (/invoice|supplier/.test(text)) return "Invoice Fraud";

    return "Social Engineering";
  }

  // =========================
  // LOGS
  // =========================
  function addScanLog(state, scamClass) {
    const item = document.createElement("div");
    item.className = "log-item";

    item.innerHTML = `
      <span>${now()}</span>
      <span>${state}</span>
      <span>${scamClass}</span>
    `;

    scanLogEl.prepend(item);
  }

  function addErrorLog(msg) {
    const item = document.createElement("div");
    item.className = "log-item";

    item.innerHTML = `
      <span>${now()}</span>
      <span>${msg}</span>
    `;

    errorLogEl.prepend(item);
  }

  // =========================
  // LOADER
  // =========================
  function showLoader() {
    loader.classList.remove("hidden");
  }

  function hideLoader() {
    loader.classList.add("hidden");
  }

  // =========================
  // RESULT
  // =========================
  function renderResult(data) {
    const band = data.band;
    const scamClass = classify(data);

    resultHeading.textContent = band;
    resultReason.textContent = scamClass;

    setState(band.toLowerCase());
    addScanLog(band, scamClass);
  }

  // =========================
  // TEXT SCAN
  // =========================
  scanBtn.addEventListener("click", async () => {

    const value = input.value.trim();

    if (!value) {
      addErrorLog("No input");
      return;
    }

    const res = await fetch("/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: value })
    });

    const data = await res.json();
    renderResult(data.data);
  });

  // =========================
  // UPLOAD
  // =========================
  uploadBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {

    const file = fileInput.files[0];

    if (!file) {
      addErrorLog("No upload");
      return;
    }

    const reader = new FileReader();

    reader.onload = async () => {

      showLoader();

      try {
        const res = await fetch("/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: reader.result })
        });

        const data = await res.json();

        hideLoader();
        renderResult(data.data);

      } catch {
        hideLoader();
        addErrorLog("Upload failed");
      }
    };

    reader.readAsDataURL(file);
  });

  // =========================
  // PASTE + CLEAR
  // =========================
  pasteBtn.addEventListener("click", async () => {
    input.value = await navigator.clipboard.readText();
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    resultHeading.textContent = "";
    resultReason.textContent = "";
    setState("idle");
  });

  setState("idle");
});