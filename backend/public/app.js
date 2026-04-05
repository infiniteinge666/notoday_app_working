// =========================
// WAIT FOR DOM
// =========================

window.addEventListener("load", () => {

  // =========================
  // ELEMENTS
  // =========================

  const startBtn = document.getElementById("startBtn");
  const scanBtn = document.getElementById("scanBtn");
  const scanAgainBtn = document.getElementById("scanAgainBtn");
  const pasteBtn = document.getElementById("pasteBtn");

  const input = document.getElementById("scanInput");

  const resultHeading = document.getElementById("resultHeading");
  const resultReason = document.getElementById("resultReason");

  const clickSound = new Audio("./assets/click.mp3");
  clickSound.preload = "auto";
  clickSound.volume = 0.3;

  // =========================
  // AUDIO (INSTANT)
  // =========================

  function playClick() {
    try {
      clickSound.currentTime = 0;
      clickSound.play();
    } catch (e) {}
  }

  // =========================
  // STATE CONTROL (LOCKED)
  // =========================

  function clearStates() {
    document.body.classList.remove(
      "state-safe",
      "state-suspicious",
      "state-critical"
    );
  }

  function applyState(band) {
    clearStates();

    const b = String(band || "").toUpperCase();

    if (b === "SAFE") {
      document.body.classList.add("state-safe");
      return;
    }

    if (b === "CRITICAL") {
      document.body.classList.add("state-critical");
      return;
    }

    document.body.classList.add("state-suspicious");
  }

  // =========================
  // SCREEN SWITCH (NO STATE HERE)
  // =========================

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));

    const target = document.getElementById(id);
    if (!target) return;

    target.classList.add("active");

    // 🔒 CRITICAL RULE: NO STATE SET HERE
    if (id !== "result") {
      clearStates();
    }
  }

  // =========================
  // RESULT RENDER (ONLY STATE ENTRY POINT)
  // =========================

  function renderResult(data) {
    if (!data) {
      resultHeading.innerText = "SUSPICIOUS";
      resultReason.innerText = "No result returned.";
      applyState("SUSPICIOUS");
      return;
    }

    const band = data.band || "SUSPICIOUS";

    resultHeading.innerText = band;

    if (Array.isArray(data.reasons) && data.reasons.length) {
      resultReason.innerText = data.reasons.join(" ");
    } else {
      resultReason.innerText = "";
    }

    applyState(band);
  }

  // =========================
  // SCAN FUNCTION
  // =========================

  async function runScan() {
    const text = input.value.trim();

    if (!text) {
      input.focus();
      return;
    }

    scanBtn.innerText = "SCANNING...";
    scanBtn.disabled = true;

    try {
      const res = await fetch("/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
      });

      const payload = await res.json();

      showScreen("result");
      renderResult(payload.data);

    } catch (err) {
      showScreen("result");
      renderResult({
        band: "SUSPICIOUS",
        reasons: ["Scan failed. Try again."]
      });
    } finally {
      scanBtn.innerText = "RUN SCAN";
      scanBtn.disabled = false;
    }
  }

  // =========================
  // INSTANT TOUCH HANDLER (NO DELAY)
  // =========================

  function instant(handler) {
    return (e) => {
      e.preventDefault();
      playClick();
      handler();
    };
  }

  // =========================
  // EVENTS (TOUCH ONLY — NO CLICK DELAY)
  // =========================

  if (startBtn) {
    startBtn.addEventListener("touchstart", instant(() => {
      showScreen("scan");
    }));
  }

  if (scanBtn) {
    scanBtn.addEventListener("touchstart", instant(() => {
      runScan();
    }));
  }

  if (scanAgainBtn) {
    scanAgainBtn.addEventListener("touchstart", instant(() => {
      input.value = "";
      showScreen("scan");
    }));
  }

  if (pasteBtn) {
    pasteBtn.addEventListener("touchstart", instant(async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) input.value = text;
      } catch {}
    }));
  }

});