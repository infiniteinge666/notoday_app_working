const btn = document.querySelector('.cta');

btn.addEventListener('click', () => {
  console.log('Scan started');

  // fake state change test
  document.body.className = "state-safe";

  alert("Scan triggered");
});