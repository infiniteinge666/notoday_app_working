const btn = document.getElementById("scanBtn");
const input = document.getElementById("input");
const result = document.getElementById("result");
const clearBtn = document.getElementById("clearBtn");
const body = document.body;

const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");

const clickSound = new Audio("./assets/click.mp3");
clickSound.preload = "auto";
clickSound.volume = 0.25;

// ================= CLEAR =================
clearBtn.onclick = () => {
  clickSound.play().catch(() => {});
  resetUI();
};

// ================= TEXT SCAN =================
btn.onclick = async () => {
  clickSound.play().catch(() => {});

  if (!input.value.trim()) {
    alert("Paste something first.");
    return;
  }

  startScan();

  try {
    const res = await fetch("/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input.value })
    });

    const data = await res.json();
    renderResult(data.data);

  } catch {
    renderResult({ band: "ERROR", reasons: ["Scan failed"] });
  }
};

// ================= IMAGE SCAN =================
uploadBtn.onclick = () => {
  clickSound.play().catch(() => {});
  fileInput.click();
};

fileInput.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  startScan();

  const reader = new FileReader();

  reader.onload = async () => {
    try {
      const base64 = reader.result.split(",")[1];

      const res = await fetch("/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64 })
      });

      const data = await res.json();
      renderResult(data.data);

    } catch {
      renderResult({ band: "ERROR", reasons: ["Image scan failed"] });
    }
  };

  reader.readAsDataURL(file);
};

// ================= SCAN STATE =================
function startScan() {
  body.classList.add("scanning");
  result.classList.add("hidden");
  document.activeElement.blur(); // 🔥 kills mobile zoom
}

// ================= RESULT =================
function renderResult(data) {
  body.classList.remove("scanning");

  result.className = "result";
  result.classList.remove("hidden");

  body.classList.remove("state-safe", "state-warning", "state-critical");

  const band = data.band;
  const reason = data.reasons?.[0] || "";

  let title = "";
  let message = "";

  if (band === "SAFE") {
    body.classList.add("state-safe");
    title = "✅ SAFE";
    message = reason || "No threats detected.";
  }

  if (band === "SUSPICIOUS") {
    body.classList.add("state-warning");
    title = "⚠️ SUSPICIOUS";
    message = reason || "Something looks off.";
  }

  if (band === "CRITICAL") {
    body.classList.add("state-critical");
    title = "🚨 CRITICAL";
    message = reason || "Likely scam.";
  }

  if (band === "ERROR") {
    title = "⚠️ ERROR";
    message = "Something went wrong.";
  }

  result.innerHTML = `
    <div class="result-title">${title}</div>
    <div class="result-reason">${message}</div>
  `;

  // 🔥 AUTO RESET (CLEAN RETURN)
  setTimeout(resetUI, 3000);
}

// ================= RESET =================
function resetUI() {
  input.value = "";
  result.classList.add("hidden");

  body.classList.remove(
    "state-safe",
    "state-warning",
    "state-critical"
  );
}