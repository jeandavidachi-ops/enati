document.querySelectorAll('.menu-row').forEach((row) => {
  row.addEventListener('pointerdown', () => row.style.transform = 'scale(0.985)');
  row.addEventListener('pointerup', () => row.style.transform = '');
  row.addEventListener('pointerleave', () => row.style.transform = '');
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  console.log('Log out clicked');
});
