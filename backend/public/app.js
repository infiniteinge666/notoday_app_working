window.addEventListener("load", () => {

  const scanBtn = document.getElementById("scanBtn");
  const input = document.getElementById("scanInput");

  const resultHeading = document.getElementById("resultHeading");
  const resultReason = document.getElementById("resultReason");

  const pasteBtn = document.getElementById("pasteBtn");
  const uploadBtn = document.getElementById("uploadBtn");
  const clearBtn = document.getElementById("clearBtn");
  const fileInput = document.getElementById("fileInput");

  // 🔊 PRELOAD AUDIO (NO LAG)
  const clickSound = new Audio("./assets/click.mp3");
  clickSound.preload = "auto";
  clickSound.volume = 0.4;

  function playClick() {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
  }

  // 🔘 BUTTON PUSH EFFECT
  function attachButtonFeedback(btn) {
    btn.addEventListener("pointerdown", () => {
      btn.classList.add("pressed");
      playClick();
    });

    btn.addEventListener("pointerup", () => {
      btn.classList.remove("pressed");
    });

    btn.addEventListener("pointerleave", () => {
      btn.classList.remove("pressed");
    });
  }

  // APPLY TO ALL BUTTONS
  [scanBtn, pasteBtn, uploadBtn, clearBtn]
  .filter(Boolean)
  .forEach(attachButtonFeedback);

  // =========================
  // STATE CONTROL (UNCHANGED)
  // =========================

  function clearState() {
    document.body.classList.remove("state-safe", "state-suspicious", "state-critical");
  }

  function setIdle() {
    clearState();
    document.body.classList.add("state-idle");
  }

  function applyState(state) {
    clearState();
    document.body.classList.add(`state-${state}`);
  }

  function renderResult(data) {
    resultHeading.textContent = data.band;
    resultReason.textContent = data.reasons?.[0] || "";

    const band = data.band.toLowerCase();

    if (band === "safe") applyState("safe");
    else if (band === "suspicious") applyState("suspicious");
    else applyState("critical");
  }

  // =========================
  // ACTIONS
  // =========================

  scanBtn.addEventListener("click", async () => {
    const value = input.value.trim();
    if (!value) return;

    clearState();

    try {
      const res = await fetch("/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value })
      });

      const data = await res.json();
      renderResult(data.data);

    } catch (err) {
      console.error(err);
    }
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    resultHeading.textContent = "";
    resultReason.textContent = "";
    setIdle();
  });

  pasteBtn.addEventListener("click", async () => {
    try {
      input.value = await navigator.clipboard.readText();
    } catch {}
  });

  uploadBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async () => {
      clearState();

      const res = await fetch("/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: reader.result })
      });

      const data = await res.json();
      renderResult(data.data);
    };

    reader.readAsDataURL(file);
  });

  setIdle();
});