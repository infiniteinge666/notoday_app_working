const btn = document.getElementById("scanBtn");
const input = document.getElementById("input");
const result = document.getElementById("result");
const clearBtn = document.getElementById("clearBtn");
const body = document.body;

// CLEAR
clearBtn.onclick = () => {
  input.value = "";
  result.classList.add("hidden");
};

// SCAN
btn.onclick = async () => {
  if (!input.value.trim()) {
    alert("Paste something first.");
    return;
  }

  startScan();

  // 🔥 Replace this with YOUR API
  const res = await fakeScan(input.value);

  showResult(res);
};

// SCANNING STATE
function startScan() {
  body.classList.add("scanning");
  result.classList.add("hidden");
}

// RESULT DISPLAY
function showResult(res) {
  body.classList.remove("scanning");

  result.className = "result"; // reset
  result.classList.remove("hidden");

  if (res.type === "safe") {
    result.classList.add("safe");
    result.innerText = "✅ Safe — No threats detected.";
  }

  if (res.type === "warning") {
    result.classList.add("warning");
    result.innerText = "⚠️ Suspicious — Be careful.";
  }

  if (res.type === "danger") {
    result.classList.add("danger");
    result.innerText = "🚨 Dangerous — Likely scam.";
  }
}

/* ================= MOCK API ================= */

function fakeScan(text) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (text.includes("password")) {
        resolve({ type: "danger" });
      } else if (text.includes("link")) {
        resolve({ type: "warning" });
      } else {
        resolve({ type: "safe" });
      }
    }, 2000);
  });
}