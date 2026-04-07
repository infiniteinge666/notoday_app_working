window.addEventListener("load", () => {

  const scanBtn = document.getElementById("scanBtn");
  const input = document.getElementById("scanInput");

  const resultHeading = document.getElementById("resultHeading");
  const resultReason = document.getElementById("resultReason");

  const pasteBtn = document.getElementById("pasteBtn");
  const uploadBtn = document.getElementById("uploadBtn");
  const clearBtn = document.getElementById("clearBtn");
  const fileInput = document.getElementById("fileInput");

  // AUDIO
  const clickSound = new Audio("./assets/click.mp3");
  clickSound.preload = "auto";
  clickSound.volume = 0.18;

  document.addEventListener("pointerdown", () => {
    clickSound.play().then(() => {
      clickSound.pause();
      clickSound.currentTime = 0;
    }).catch(() => {});
  }, { once: true });

  function playClick() {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
  }

  function attachButtonFeedback(btn) {
    btn.addEventListener("pointerdown", () => {
      btn.classList.add("pressed");
      playClick();
    });

    btn.addEventListener("pointerup", () => {
      requestAnimationFrame(() => {
        btn.classList.remove("pressed");
      });
    });

    btn.addEventListener("pointerleave", () => {
      btn.classList.remove("pressed");
    });
  }

  [scanBtn, pasteBtn, uploadBtn, clearBtn]
    .filter(Boolean)
    .forEach(attachButtonFeedback);

  // 🔒 STATE CONTROL
  const STATES = [
    "state-idle",
    "state-safe",
    "state-suspicious",
    "state-critical"
  ];

  function setState(state) {
    STATES.forEach(s => document.body.classList.remove(s));
    document.body.classList.add(`state-${state}`);
  }

  function renderResult(data) {
    resultHeading.textContent = data.band;
    resultReason.textContent = data.reasons?.[0] || "";

    const band = data.band?.toLowerCase();

    if (band === "safe") setState("safe");
    else if (band === "suspicious") setState("suspicious");
    else if (band === "critical") setState("critical");
    else setState("idle");
  }

  scanBtn.addEventListener("click", async () => {
    const value = input.value.trim();
    if (!value) return;

    setState("idle");

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
      setState("idle");
    }
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    resultHeading.textContent = "";
    resultReason.textContent = "";
    setState("idle");
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
      setState("idle");

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

  setState("idle");
});