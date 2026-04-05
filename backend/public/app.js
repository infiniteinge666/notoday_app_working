// =========================
// WAIT FOR DOM
// =========================

window.addEventListener("load", () => {
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

  function playClick() {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {
      // autoplay restrictions or missing file — fail silently
    });
  }

  function clearBodyStates() {
    document.body.classList.remove(
      "theme-landing",
      "theme-scan",
      "theme-safe",
      "theme-suspicious",
      "theme-critical",
      "state-safe",
      "state-suspicious",
      "state-critical"
    );
  }

  function applyScreenTheme(screenId) {
    clearBodyStates();

    if (screenId === "landing") {
      document.body.classList.add("theme-landing");
      return;
    }

    if (screenId === "scan") {
      document.body.classList.add("theme-scan");
      return;
    }

    // RESULT SCREEN MUST BE STATELESS UNTIL THE ENGINE RETURNS A BAND
    // No default warning, no guessed color, no assumed state.
  }

  function applyResultState(band) {
    const normalized = String(band || "").trim().toUpperCase();

    document.body.classList.remove(
      "theme-safe",
      "theme-suspicious",
      "theme-critical",
      "state-safe",
      "state-suspicious",
      "state-critical"
    );

    if (normalized === "SAFE") {
      document.body.classList.add("theme-safe", "state-safe");
      return;
    }

    if (normalized === "CRITICAL") {
      document.body.classList.add("theme-critical", "state-critical");
      return;
    }

    document.body.classList.add("theme-suspicious", "state-suspicious");
  }

  function showScreen(targetId) {
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active");
    });

    const target = document.getElementById(targetId);

    if (!target) {
      console.error("Screen not found:", targetId);
      return;
    }

    target.classList.add("active");
    applyScreenTheme(targetId);
  }

  function renderResult(data) {
    if (!data) {
      resultHeading.innerText = "SUSPICIOUS";
      resultReason.innerText = "No valid result was returned.";
      applyResultState("SUSPICIOUS");
      return;
    }

    const band = data.band || "SUSPICIOUS";
    resultHeading.innerText = band;

    if (Array.isArray(data.reasons) && data.reasons.length > 0) {
      resultReason.innerText = data.reasons.join(" ");
    } else {
      resultReason.innerText = "No clear indicators found.";
    }

    applyResultState(band);
  }

  if (startBtn) {
    startBtn.addEventListener("click", (e) => {
      e.preventDefault();
      playClick();
      showScreen("scan");
    });
  }

  if (pasteBtn) {
    pasteBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      playClick();

      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          input.value = text;
          input.focus();
        }
      } catch (err) {
        console.error("Clipboard paste failed:", err);
      }
    });
  }

  if (scanBtn) {
    scanBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      playClick();

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

        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const payload = await res.json();

        showScreen("result");
        renderResult(payload.data);
      } catch (err) {
        console.error(err);

        showScreen("result");
        renderResult({
          band: "SUSPICIOUS",
          reasons: ["Something went wrong. Please try again."]
        });
      } finally {
        scanBtn.innerText = "RUN SCAN";
        scanBtn.disabled = false;
      }
    });
  }

  if (scanAgainBtn) {
    scanAgainBtn.addEventListener("click", (e) => {
      e.preventDefault();
      playClick();
      input.value = "";
      showScreen("scan");
      input.focus();
    });
  }

  applyScreenTheme("landing");
});