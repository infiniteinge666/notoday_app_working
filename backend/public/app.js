const scanBtn = document.getElementById("scanBtn");
const input = document.getElementById("scanInput");

const resultBand = document.getElementById("resultBand");
const resultText = document.getElementById("resultText");
const resultScore = document.getElementById("resultScore");
const slab = document.getElementById("slab");

const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const pasteBtn = document.getElementById("pasteBtn");

/* ================================
   SCAN TEXT
================================ */
scanBtn.onclick = async () => {
    const text = input.value.trim();

    if (!text) {
        setResult("SUSPICIOUS", "0", "Nothing to scan");
        return;
    }

    setResult("AWAITING", "--", "Scanning...");

    try {
        const res = await fetch("/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });

        const data = await res.json();

        setResult(
            data.band || "SAFE",
            data.score || "0",
            data.reason || "No explanation available"
        );

    } catch {
        setResult("CRITICAL", "100", "Scan failed. Connection issue.");
    }
};

/* ================================
   PASTE
================================ */
pasteBtn.onclick = async () => {
    try {
        const text = await navigator.clipboard.readText();
        input.value = text;
        setResult("AWAITING", "--", "Text pasted. Ready to scan.");
    } catch {
        setResult("SUSPICIOUS", "0", "Clipboard access denied.");
    }
};

/* ================================
   UPLOAD IMAGE
================================ */
uploadBtn.onclick = () => fileInput.click();

fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async () => {
        const base64 = reader.result.split(",")[1];

        setResult("AWAITING", "--", "Image uploaded. Scanning...");

        try {
            const res = await fetch("/check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageBase64: base64 })
            });

            const data = await res.json();

            setResult(
                data.band || "SAFE",
                data.score || "0",
                data.reason || "No explanation available"
            );

        } catch {
            setResult("CRITICAL", "100", "Image scan failed.");
        }
    };

    reader.readAsDataURL(file);
};

/* ================================
   RESULT HANDLER
================================ */
function setResult(band, score, message) {
    resultBand.innerText = band;
    resultScore.innerText = "Score: " + score;
    resultText.innerText = message;

    slab.setAttribute("data-band", band);
}