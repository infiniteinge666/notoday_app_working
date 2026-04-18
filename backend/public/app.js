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

  function setState(state) {
    document.body.className = `state-${state}`;
  }

  function renderResult(data) {
    if (!data) return;

    const band = (data.band || "SAFE").toLowerCase();

    setState(band);

    resultHeading.textContent = data.band || "RESULT";
    resultReason.textContent = (data.reasons && data.reasons.join(", ")) || "";
  }

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
      console.error("Text scan failed:", err);
      setState("suspicious");
    }
  }

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_SIZE = 8 * 1024 * 1024;

    if (file.size > MAX_SIZE) {
      alert("Image too large. Please use a smaller screenshot.");
      fileInput.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = async function () {
      try {
        if (!reader.result || !reader.result.includes(",")) {
          throw new Error("Invalid image data");
        }

        const base64 = reader.result.split(",")[1];

        setState("processing");

        const res = await fetch("https://notoday.co.za/check", {
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
        alert("Upload failed: " + err.message);
        setState("suspicious");
      }
    };

    reader.onerror = function () {
      console.error("FileReader error");
      alert("Failed to read image");
      setState("suspicious");
    };

    reader.readAsDataURL(file);
  });

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