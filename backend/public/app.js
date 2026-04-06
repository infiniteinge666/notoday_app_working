const btn = document.getElementById("scanBtn");
const input = document.getElementById("input");
const result = document.getElementById("result");
const clearBtn = document.getElementById("clearBtn");
const body = document.body;

// 🔊 CLICK SOUND (preload to remove lag)
const clickSound = new Audio("./assets/click.mp3");
clickSound.preload = "auto";
clickSound.volume = 0.25;

// CLEAR
clearBtn.onclick = () => {
  clickSound.play().catch(() => {});
  input.value = "";
  result.classList.add("hidden");

  // also clear state
  body.classList.remove("state-safe", "state-warning", "state-critical");
};

// SCAN
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
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: input.value
      })
    });

    const data = await res.json();

    renderResult(data.data);

  } catch (err) {
    console.error(err);

    renderResult({
      band: "ERROR",
      reasons: ["System could not complete the scan."]
    });
  }
};

// SCANNING STATE (NO RISK STATE HERE)
function startScan() {
  body.classList.add("scanning");
  result.classList.add("hidden");
}

// 🔒 ONLY PLACE WHERE STATE IS APPLIED
function renderResult(data) {
  body.classList.remove("scanning");

  result.className = "result";
  result.classList.remove("hidden");

  // reset state
  body.classList.remove("state-safe", "state-warning", "state-critical");

  const band = data.band;
  const reason = data.reasons?.[0] || "";

  let title = "";
  let message = "";

  if (band === "SAFE") {
    body.classList.add("state-safe");
    result.classList.add("safe");

    title = "✅ SAFE";
    message = reason || "No threats detected.";
  }

  if (band === "SUSPICIOUS") {
    body.classList.add("state-warning");
    result.classList.add("warning");

    title = "⚠️ SUSPICIOUS";
    message = reason || "Something looks off.";
  }

  if (band === "CRITICAL") {
    body.classList.add("state-critical");
    result.classList.add("danger");

    title = "🚨 CRITICAL";
    message = reason || "Likely scam.";
  }

  if (band === "ERROR") {
    title = "⚠️ ERROR";
    message = "Something went wrong. Try again.";
  }

  // 🔥 IMPORTANT: structured output (state + reason)
  result.innerHTML = `
    <div class="result-title">${title}</div>
    <div class="result-reason">${message}</div>
  `;
}