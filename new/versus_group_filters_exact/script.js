document.querySelectorAll('.option').forEach((button) => {
  button.addEventListener('click', () => button.classList.toggle('selected'));
});
