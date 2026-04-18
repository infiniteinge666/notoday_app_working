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

  // =========================
  // STATE
  // =========================
  function setState(state) {
    document.body.className = `state-${state}`;
  }

  // =========================
  // RESULT
  // =========================
  function renderResult(data) {
    if (!data) return;

    const band = (data.band || "SAFE").toLowerCase();
    setState(band);

    resultHeading.textContent = data.band || "RESULT";
    resultReason.textContent = (data.reasons || []).join(", ");
  }

  // =========================
  // TEXT SCAN
  // =========================
  async function handleTextScan() {
    const text = input.value.trim();
    if (!text) return;

    setState("processing");

    try {
      const res = await fetch("https://notoday.co.za/check", {
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
      console.error("TEXT ERROR:", err);
      alert("Scan failed");
      setState("idle");
    }
  }

  // =========================
  // IMAGE UPLOAD
  // =========================
  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert("Image too large");
      fileInput.value = "";
      return;
    }

    try {
      setState("processing");
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("https://notoday.co.za/check", {
        method: "POST",
        body: formData,
      });

      const payload = await res.json();

      if (payload && payload.data) {
        renderResult(payload.data);
      }

    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      alert("Upload failed: " + err);
      setState("idle");
    }

    fileInput.value = "";
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

  setState("idle");

});
