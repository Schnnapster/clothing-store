/* ============================================================
   script.js — ЗАГАЛЬНА ІНІЦІАЛІЗАЦІЯ ТА UI
   Підключається останнім: тут запускаються модулі кошика,
   каталогу та оформлення замовлення.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initCart();      // cart.js
  initCatalog();   // catalog.js
  initCheckout();  // checkout.js
  initUI();
});

function initUI() {
  const burger = document.getElementById('burgerBtn');
  const nav = document.getElementById('nav');
  const overlay = document.getElementById('overlay');

  // Мобільне меню
  burger.addEventListener('click', () => {
    burger.classList.toggle('is-open');
    nav.classList.toggle('is-open');
  });

  // Клік по посиланню в меню — закриваємо його
  nav.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      burger.classList.remove('is-open');
      nav.classList.remove('is-open');
    });
  });

  // Затемнення закриває кошик
  overlay.addEventListener('click', closeCart);

  // Esc закриває будь-яке відкрите вікно (спочатку верхнє)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;

    if (document.getElementById('checkoutModal').classList.contains('is-open')) {
      closeCheckout();
    } else if (document.getElementById('quickModal').classList.contains('is-open')) {
      closeQuickView();
    } else if (document.getElementById('cartDrawer').classList.contains('is-open')) {
      closeCart();
    }
  });

  // Плавна поява секцій при скролі
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'none';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.benefit, .review').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(18px)';
    el.style.transition = 'opacity .5s ease, transform .5s ease';
    observer.observe(el);
  });
}
