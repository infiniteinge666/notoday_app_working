const btn = document.querySelector('.cta');
const textarea = document.querySelector('.input');
const clearBtn = document.querySelector('.soft-btn');

btn.addEventListener('click', () => {
  if (!textarea.value.trim()) {
    alert("Paste something to scan first.");
    return;
  }

  document.body.classList.add("scanning");

  setTimeout(() => {
    document.body.classList.remove("scanning");
    alert("Scan complete!");
  }, 1500);
});

clearBtn.addEventListener('click', () => {
  textarea.value = "";
});