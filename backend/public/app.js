window.addEventListener("load", () => {

  // =========================
  // ELEMENTS
  // =========================
  const scanBtn = document.getElementById("scanBtn");
  const input = document.getElementById("scanInput");

  const resultHeading = document.getElementById("resultHeading");
  const resultReason = document.getElementById("resultReason");

  const pasteBtn = document.getElementById("pasteBtn");
  const uploadBtn = document.getElementById("uploadBtn");
  const clearBtn = document.getElementById("clearBtn");
  const fileInput = document.getElementById("fileInput");

  // =========================
  // SOUND
  // =========================
  const clickSound = new Audio("./assets/click.mp3");
  clickSound.volume = 0.2;

  function playClick() {
    try {
      clickSound.currentTime = 0;
      clickSound.play();
    } catch (e) {
      // ignore autoplay restrictions
    }
  }

  // =========================
  // STATE CONTROL (LOCKED)
  // =========================
  function clearState() {
    document.body.classList.remove(
      "state-safe",
      "state-suspicious",
      "state-critical"
    );
  }

  function setIdle() {
    clearState();
    document.body.classList.add("state-idle");
  }

  function applyState(state) {
    clearState();
    document.body.classList.add(`state-${state}`);
  }

  // =========================
  // RENDER RESULT
  // =========================
  function renderResult(data) {

    if (!data) {
      resultHeading.textContent = "ERROR";
      resultReason.textContent = "No response from scan engine.";
      applyState("suspicious");
      return;
    }

    resultHeading.textContent = data.band || "";
    resultReason.textContent = data.reasons?.[0] || "";

    const band = (data.band || "").toLowerCase();

    if (band === "safe") applyState("safe");
    else if (band === "suspicious") applyState("suspicious");
    else if (band === "critical") applyState("critical");
    else setIdle(); // fallback safety
  }

  // =========================
  // SCAN ACTION
  // =========================
  scanBtn.addEventListener("click", async () => {

    playClick();

    const value = input.value.trim();
    if (!value) return;

    // 🔒 NO STATE BEFORE RESULT
    clearState();

    // Optional: disable button during scan
    scanBtn.disabled = true;

    try {
      const res = await fetch("/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: value })
      });

      const json = await res.json();

      renderResult(json.data);

    } catch (err) {
      console.error(err);

      resultHeading.textContent = "ERROR";
      resultReason.textContent = "Scan failed. Try again.";
      applyState("suspicious");
    }

    scanBtn.disabled = false;

  });

  // =========================
  // CLEAR → RETURN TO IDLE
  // =========================
  clearBtn.addEventListener("click", () => {

    playClick();

    // Clear input
    input.value = "";

    // Clear result UI
    resultHeading.textContent = "";
    resultReason.textContent = "";

    // 🔥 RETURN TO IDLE STATE
    setIdle();

  });

  // =========================
  // PASTE
  // =========================
  pasteBtn.addEventListener("click", async () => {

    playClick();

    try {
      const text = await navigator.clipboard.readText();
      input.value = text;
    } catch (err) {
      console.warn("Clipboard blocked");
    }

  });

  // =========================
  // UPLOAD → IMAGE → BASE64
  // =========================
  uploadBtn.addEventListener("click", () => {
    playClick();
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {

    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async function () {

      // 🔒 NO STATE BEFORE RESULT
      clearState();

      scanBtn.disabled = true;

      try {
        const res = await fetch("/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            imageBase64: reader.result
          })
        });

        const json = await res.json();

        renderResult(json.data);

      } catch (err) {
        console.error(err);

        resultHeading.textContent = "ERROR";
        resultReason.textContent = "Image scan failed.";
        applyState("suspicious");
      }

      scanBtn.disabled = false;
    };

    reader.readAsDataURL(file);

  });

  // =========================
  // INIT → IDLE STATE
  // =========================
  setIdle();

});