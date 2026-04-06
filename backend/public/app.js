const btn = document.querySelector('.cta');
const textarea = document.querySelector('.input');
const clearBtn = document.querySelector('.mini-btn');

btn.addEventListener('click', () => {
  if (!textarea.value.trim()) {
    alert("Paste something to scan first.");
    return;
  }

  // Start scanning state
  document.body.className = "state-scanning";

  setTimeout(() => {
    // Simulate result
    const states = ["state-safe", "state-suspicious", "state-critical"];
    const random = states[Math.floor(Math.random() * states.length)];

    document.body.className = random;

    alert("Scan complete!");
  }, 1500);
});

// Clear input
clearBtn.addEventListener('click', () => {
  textarea.value = "";
  document.body.className = "state-idle";
});