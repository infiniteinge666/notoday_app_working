const btn = document.querySelector('.cta');
const textarea = document.querySelector('.input');
const clearBtn = document.querySelector('.soft-btn');

btn.addEventListener('click', () => {
  if (!textarea.value.trim()) {
    alert("Paste something first.");
    return;
  }

  alert("Scan started...");
});

clearBtn.addEventListener('click', () => {
  textarea.value = "";
});