const btn = document.getElementById("scanBtn");
const input = document.getElementById("input");
const result = document.getElementById("result");
const clearBtn = document.getElementById("clearBtn");
const body = document.body;

// 🔊 CLICK SOUND
const clickSound = new Audio("./assets/click.mp3");
clickSound.preload = "auto";
clickSound.volume = 0.25;

// CLEAR
clearBtn.onclick = () => {
clickSound.play().catch(() => {});
input.value = "";
result.classList.add("hidden");

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

```
if (!res.ok) throw new Error("Server error");

const data = await res.json();

renderResult(data.data);
```

} catch (err) {
console.error(err);

```
renderResult({
  band: "ERROR",
  reasons: ["System could not complete the scan."]
});
```

}
};

// SCANNING STATE
function startScan() {
body.classList.add("scanning");
result.classList.add("hidden");
}

// RENDER RESULT
function renderResult(data) {
body.classList.remove("scanning");

result.className = "result";
result.classList.remove("hidden");

body.classList.remove("state-safe", "state-warning", "state-critical");

const band = data.band;
const reasons = data.reasons?.join("<br>") || "";

let title = "";
let message = reasons;

if (band === "SAFE") {
result.classList.add("safe");
title = "✅ SAFE";
message = message || "No threats detected.";
}

if (band === "SUSPICIOUS") {
result.classList.add("warning");
title = "⚠️ SUSPICIOUS";
message = message || "Something looks off.";
}

if (band === "CRITICAL") {
result.classList.add("danger");
title = "🚨 CRITICAL";
message = message || "Likely scam.";
}

if (band === "ERROR") {
title = "⚠️ ERROR";
message = "Something went wrong. Try again.";
}

result.innerHTML = `     <div class="result-title">${title}</div>     <div class="result-reason">${message}</div>
  `;
}
