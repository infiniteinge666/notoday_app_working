// =========================
// WAIT FOR DOM
// =========================

window.addEventListener("load", () => {

  const startBtn = document.getElementById("startBtn");
  const scanBtn = document.getElementById("scanBtn");
  const scanAgainBtn = document.getElementById("scanAgainBtn");

  const input = document.getElementById("scanInput");

  const resultHeading = document.getElementById("resultHeading");
  const resultReason = document.getElementById("resultReason");

  function showScreen(targetId) {
    document.querySelectorAll(".screen").forEach(screen => {
      screen.classList.remove("active");
    });

    const target = document.getElementById(targetId);

    if (target) {
      target.classList.add("active");
    } else {
      console.error("Screen not found:", targetId);
    }
  }

  // START BUTTON
  if (startBtn) {
    startBtn.onclick = (e) => {
      e.preventDefault();
      console.log("START CLICKED");
      showScreen("scan"); // ✅ FIXED
    };
  }

  // RUN SCAN
  if (scanBtn) {
    scanBtn.onclick = async (e) => {
      e.preventDefault();

      const text = input.value.trim();

      if (!text) {
        input.focus();
        return;
      }

      scanBtn.innerText = "SCANNING...";
      scanBtn.disabled = true;

      try {
        const res = await fetch("http://localhost:3000/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ text })
        });

        const data = await res.json();

        renderResult(data.data);
        showScreen("result"); // ✅ FIXED

      } catch (err) {
        console.error(err);
        alert("Something went wrong");
      }

      scanBtn.innerText = "RUN SCAN";
      scanBtn.disabled = false;
    };
  }

  // SCAN AGAIN
  if (scanAgainBtn) {
    scanAgainBtn.onclick = (e) => {
      e.preventDefault();
      input.value = "";
      showScreen("scan"); // ✅ FIXED
    };
  }

  function renderResult(data) {
    if (!data) return;

    resultHeading.innerText = data.band;

    if (data.reasons && data.reasons.length) {
      resultReason.innerText = data.reasons.join(" ");
    } else {
      resultReason.innerText = "No clear indicators found.";
    }
  }

});