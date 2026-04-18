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
  // TEXT SCAN
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
      alert("Scan failed");
      setState("idle");
    }
  }

  // =========================
  // SAFE BASE64 READER (FIX)
  // =========================
  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        try {
          if (!reader.result || !reader.result.includes(",")) {
            return reject("Invalid image data");
          }

          const base64 = reader.result.split(",")[1];

          if (!base64 || base64.length < 100) {
            return reject("Corrupted image data");
          }

          resolve(base64);

        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => {
        reject("FileReader failed");
      };

      reader.readAsDataURL(file);
    });
  }

  // =========================
  // SCREENSHOT UPLOAD (FIXED)
  // =========================
  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_SIZE = 8 * 1024 * 1024;

    if (file.size > MAX_SIZE) {
      alert("Image too large. Please use a smaller screenshot.");
      fileInput.value = "";
      return;
    }

    try {
      setState("processing");

      const base64 = await readFileAsBase64(file);

      console.log("BASE64 LENGTH:", base64.length);

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

  // =========================
  // INIT
  // =========================
  setState("idle");

});