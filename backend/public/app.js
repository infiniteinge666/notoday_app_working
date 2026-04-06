window.addEventListener("load", () => {

  const scanBtn = document.getElementById("scanBtn");
  const input = document.getElementById("scanInput");

  const resultHeading = document.getElementById("resultHeading");
  const resultReason = document.getElementById("resultReason");

  const clickSound = new Audio("./assets/click.mp3");
  clickSound.volume = 0.2;

  function clearState() {
    document.body.classList.remove("state-safe", "state-suspicious", "state-critical");
  }

  function applyState(state) {
    clearState();
    document.body.classList.add(`state-${state}`);
  }

  function renderResult(data) {
    resultHeading.textContent = data.band;
    resultReason.textContent = data.reasons?.[0] || "";

    const band = data.band.toLowerCase();

    if (band === "safe") applyState("safe");
    else if (band === "suspicious") applyState("suspicious");
    else applyState("critical");
  }

  scanBtn.addEventListener("click", async () => {

    clickSound.currentTime = 0;
    clickSound.play();

    const value = input.value.trim();
    if (!value) return;

    clearState(); // 🔥 NO STATE BEFORE RESULT

    try {
      const res = await fetch("/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: value })
      });

      const data = await res.json();

      renderResult(data.data);

    } catch (err) {
      console.error(err);
    }

  });

});