(() => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.site-nav');

  if (!burger || !nav) return;

  const toggle = () => {
    nav.classList.toggle('is-open');
  };

  burger.addEventListener('click', toggle);

  nav.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    nav.classList.remove('is-open');
  });

  document.addEventListener('click', (e) => {
    if (!nav.classList.contains('is-open')) return;
    const inside = nav.contains(e.target) || burger.contains(e.target);

    if (!inside) {
      nav.classList.remove('is-open');
    }
  });
})();
