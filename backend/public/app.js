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
  // RESULT RENDER
  // =========================
  function renderResult(data) {
    if (!data) return;

    const band = (data.band || "SAFE").toLowerCase();

    setState(band);

    resultHeading.textContent = data.band || "RESULT";
    resultReason.textContent = (data.reasons && data.reasons.join(", ")) || "";
  }

  // =========================
  // TEXT SCAN (UNCHANGED LOGIC)
  // =========================
  async function handleTextScan() {
    const text = input.value.trim();
    if (!text) return;

    setState("processing");

    try {
      const res = await fetch("/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const payload = await res.json();

      if (payload && payload.data) {
        renderResult(payload.data);
      }
    } catch (err) {
      console.error("Text scan failed:", err);
      setState("suspicious");
    }
  }

  // =========================
  // SCREENSHOT UPLOAD (FIXED)
  // =========================
  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Frontend size guard (8MB)
    const MAX_SIZE = 8 * 1024 * 1024;

    if (file.size > MAX_SIZE) {
      console.warn("File too large, rejected before upload");
      alert("Image too large. Please use a smaller screenshot.");
      fileInput.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = async function () {
      const base64 = reader.result.split(",")[1];

      setState("processing");

      try {
        const res = await fetch("/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageBase64: base64,
          }),
        });

        const payload = await res.json();

        if (payload && payload.data) {
          renderResult(payload.data);
        }
      } catch (err) {
        console.error("Image scan failed:", err);
        setState("suspicious");
      }
    };

    reader.readAsDataURL(file);
  });

  // =========================
  // BUTTONS
  // =========================
  scanBtn.addEventListener("click", handleTextScan);

  pasteBtn.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      input.value = text;
    } catch (err) {
      console.error("Paste failed:", err);
    }
  });

  uploadBtn.addEventListener("click", () => {
    fileInput.click();
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    fileInput.value = "";
    setState("idle");
    resultHeading.textContent = "";
    resultReason.textContent = "";
  });

  // =========================
  // INIT
  // =========================
  setState("idle");

});