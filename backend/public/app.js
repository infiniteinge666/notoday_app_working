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

  result.className = "result"; // reset
  result.classList.remove("hidden");

  // remove old state
  body.classList.remove("state-safe", "state-warning", "state-critical");

  const band = data.band;

  if (band === "SAFE") {
    body.classList.add("state-safe");
    result.classList.add("safe");
    result.innerText = "✅ Safe — No threats detected.";
  }

  if (band === "SUSPICIOUS") {
    body.classList.add("state-warning");
    result.classList.add("warning");
    result.innerText = data.reasons?.[0] || "⚠️ Suspicious — Be careful.";
  }

  if (band === "CRITICAL") {
    body.classList.add("state-critical");
    result.classList.add("danger");
    result.innerText = data.reasons?.[0] || "🚨 Dangerous — Likely scam.";
  }

  if (band === "ERROR") {
    result.innerText = "⚠️ Something went wrong. Try again.";
  }
}