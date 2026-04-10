"use strict";

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

  const loader = $("loaderOverlay");

  // =========================
  // STATE
  // =========================
  function setState(state) {
    document.body.className = `state-${state}`;
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
  // TOKEN
  // =========================
  function getToken() {
    return localStorage.getItem("notoday_token") || "";
  }

  // =========================
  // RESULT
  // =========================
  function renderResult(data) {
    const band = data.band;

    resultHeading.textContent = band;

    // 🔥 MULTI-LINE EXPLANATION (CORRECT)
    if (data.explanation && data.explanation.length > 0) {
      resultReason.innerHTML = data.explanation
        .map(line => `<div>${line}</div>`)
        .join("");
    } else {
      resultReason.textContent = "No explanation available.";
    }

    setState(band.toLowerCase());
  }

  // =========================
  // HANDLE BLOCKED STATE
  // =========================
  function renderBlocked(message) {
    resultHeading.textContent = "BLOCKED";
    resultReason.textContent = message || "Access restricted.";
    setState("blocked");
  }

  // =========================
  // TEXT SCAN
  // =========================
  scanBtn.addEventListener("click", async () => {

    const value = input.value.trim();
    if (!value) return;

    showLoader();

    try {
      const res = await fetch("/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-token": getToken()
        },
        body: JSON.stringify({ text: value })
      });

      const data = await res.json();

      hideLoader();

      // 🔥 HANDLE TOKEN BLOCK
      if (!data.success) {
        renderBlocked(data.message || "Access denied");
        return;
      }

      renderResult(data.data);

    } catch {
      hideLoader();
      resultReason.textContent = "Scan failed. Please try again.";
      setState("error");
    }
  });

  // =========================
  // UPLOAD
  // =========================
  uploadBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {

    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async () => {

      showLoader();

      try {
        const res = await fetch("/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-token": getToken()
          },
          body: JSON.stringify({ imageBase64: reader.result })
        });

        const data = await res.json();

        hideLoader();

        if (!data.success) {
          renderBlocked(data.message || "Access denied");
          return;
        }

        renderResult(data.data);

      } catch {
        hideLoader();
        resultReason.textContent = "Upload failed.";
        setState("error");
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