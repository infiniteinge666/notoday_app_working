window.addEventListener("load", () => {

  // =========================
  // SAFE ELEMENT GETTER
  // =========================
  const $ = (id) => document.getElementById(id);

  const scanBtn = $("scanBtn");
  const input = $("scanInput");

  const resultHeading = $("resultHeading");
  const resultReason = $("resultReason");

  const pasteBtn = $("pasteBtn");
  const uploadBtn = $("uploadBtn");
  const clearBtn = $("clearBtn");
  const fileInput = $("fileInput");

  // =========================
  // AUDIO (LOW-LAG SAFE)
  // =========================
  const clickSound = new Audio("./assets/click.mp3");
  clickSound.preload = "auto";
  clickSound.volume = 0.12;

  // unlock audio on first touch
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

  // =========================
  // BUTTON FEEDBACK
  // =========================
  function attachButtonFeedback(btn) {
    if (!btn) return;

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

  [scanBtn, pasteBtn, uploadBtn, clearBtn].forEach(attachButtonFeedback);

  // =========================
  // STATE CONTROL (LOCKED)
  // =========================
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

  // =========================
  // RESULT RENDER (ONLY STATE ENTRY POINT)
  // =========================
  function renderResult(data) {
    if (!data) {
      setState("idle");
      return;
    }

    if (resultHeading) resultHeading.textContent = data.band || "";
    if (resultReason) resultReason.textContent = data.reasons?.[0] || "";

    const band = data.band?.toLowerCase();

    if (band === "safe") setState("safe");
    else if (band === "suspicious") setState("suspicious");
    else if (band === "critical") setState("critical");
    else setState("idle");
  }

  // =========================
  // SCAN TEXT
  // =========================
  if (scanBtn && input) {
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

        if (!res.ok) {
          console.error("Server error:", res.status);
          return setState("idle");
        }

        const data = await res.json();

        if (!data || !data.data) {
          console.error("Invalid response:", data);
          return setState("idle");
        }

        renderResult(data.data);

      } catch (err) {
        console.error("Scan failed:", err);
        setState("idle");
      }
    });
  }

  // =========================
  // CLEAR
  // =========================
  if (clearBtn && input) {
    clearBtn.addEventListener("click", () => {
      input.value = "";
      if (resultHeading) resultHeading.textContent = "";
      if (resultReason) resultReason.textContent = "";
      setState("idle");
    });
  }

  // =========================
  // PASTE
  // =========================
  if (pasteBtn && input) {
    pasteBtn.addEventListener("click", async () => {
      try {
        input.value = await navigator.clipboard.readText();
      } catch (err) {
        console.warn("Clipboard blocked");
      }
    });
  }

  // =========================
  // UPLOAD IMAGE
  // =========================
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;

      // 🔒 VALIDATION
      if (!file.type.startsWith("image/")) {
        console.warn("Invalid file type");
        return;
      }

      if (file.type === "image/heic") {
        console.warn("HEIC not supported");
        return;
      }

      const reader = new FileReader();

      reader.onload = async () => {
        setState("idle");

        try {
          const res = await fetch("/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: reader.result })
          });

          if (!res.ok) {
            console.error("Upload server error:", res.status);
            return setState("idle");
          }

          const data = await res.json();

          if (!data || !data.data) {
            console.error("Invalid upload response:", data);
            return setState("idle");
          }

          renderResult(data.data);

        } catch (err) {
          console.error("Upload failed:", err);
          setState("idle");
        }
      };

      reader.onerror = () => {
        console.error("File read error");
      };

      reader.readAsDataURL(file);
    });
  }

  // =========================
  // INIT
  // =========================
  setState("idle");

  console.log("NoToday UI loaded — stable");

});