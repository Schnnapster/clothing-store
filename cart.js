/* ============================================================
   cart.js — ЛОГІКА КОШИКА
   ------------------------------------------------------------
   Кошик — це масив об'єктів (позицій). Одна позиція = товар
   у конкретному розмірі та кольорі:

   { id, size, color, qty }

   Ключова ідея: унікальність позиції визначається трійкою
   id + size + color. Тому одна й та сама футболка в розмірі M
   і в розмірі L — це ДВІ різні позиції кошика, а повторне
   додавання футболки M лише збільшує кількість (qty).
   ============================================================ */

const FREE_SHIPPING_FROM = 1500; // безкоштовна доставка від цієї суми
const SHIPPING_COST = 80;        // вартість доставки, якщо сума менша

// Стан кошика; відновлюємо з localStorage, щоб дані не губилися при перезавантаженні
let cart = loadCart();

/* ---------- Збереження / відновлення ---------- */

function loadCart() {
  try {
    const raw = localStorage.getItem('atelier_cart');
    const parsed = raw ? JSON.parse(raw) : [];
    // Фільтруємо «сміття»: залишаємо лише позиції, товар яких досі існує
    return Array.isArray(parsed)
      ? parsed.filter(i => getProduct(i.id) && i.qty > 0)
      : [];
  } catch (e) {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem('atelier_cart', JSON.stringify(cart));
  } catch (e) {
    /* localStorage може бути недоступний — тихо ігноруємо */
  }
}

/* ---------- Допоміжні ---------- */

// Знайти товар у каталозі за id
function getProduct(id) {
  return PRODUCTS.find(p => p.id === Number(id));
}

// Форматування ціни: 1990 -> "1 990 ₴"
function formatPrice(value) {
  return value.toLocaleString('uk-UA').replace(/,/g, ' ') + ' ₴';
}

// Підпис розміру: для аксесуарів показуємо «Один розмір»
function sizeLabel(size) {
  return size === 'ONE' ? 'Один розмір' : size;
}

/* ---------- Розрахунки ---------- */

// Сума товарів без доставки
function cartSubtotal() {
  return cart.reduce((sum, item) => {
    const product = getProduct(item.id);
    return product ? sum + product.price * item.qty : sum;
  }, 0);
}

// Загальна кількість одиниць товару (для лічильника в header)
function cartQty() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

// Вартість доставки залежить від суми замовлення
function cartShipping() {
  const subtotal = cartSubtotal();
  if (subtotal === 0) return 0;
  return subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;
}

// Фінальна сума до сплати
function cartTotal() {
  return cartSubtotal() + cartShipping();
}

/* ---------- Операції з кошиком ---------- */

/**
 * Додати товар у кошик.
 * Якщо така сама позиція (id + size + color) вже є — просто +qty.
 */
function addToCart(id, size, color, qty = 1) {
  const product = getProduct(id);
  if (!product) return;

  // Якщо розмір/колір не передані — беремо перші доступні
  const finalSize = size || product.sizes[0];
  const finalColor = color || product.colors[0];

  const existing = cart.find(
    i => i.id === product.id && i.size === finalSize && i.color === finalColor
  );

  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: product.id, size: finalSize, color: finalColor, qty });
  }

  saveCart();
  renderCart();
  bumpCartIcon();
  showToast(`«${product.name}» додано в кошик`);
}

// Змінити кількість позиції на delta (+1 / -1). При qty <= 0 позиція видаляється.
function changeQty(index, delta) {
  const item = cart[index];
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    cart.splice(index, 1);
  }

  saveCart();
  renderCart();
}

// Видалити позицію повністю
function removeFromCart(index) {
  if (!cart[index]) return;
  cart.splice(index, 1);
  saveCart();
  renderCart();
  showToast('Товар видалено з кошика');
}

// Очистити кошик
function clearCart() {
  cart = [];
  saveCart();
  renderCart();
}

/* ---------- Рендер ---------- */

// Головна функція оновлення інтерфейсу кошика.
// Викликається після будь-якої зміни стану.
function renderCart() {
  const itemsBox = document.getElementById('cartItems');
  const emptyBox = document.getElementById('cartEmpty');
  const footBox = document.getElementById('cartFoot');

  // 1. Лічильники в header і в заголовку панелі
  const qty = cartQty();
  document.getElementById('cartCount').textContent = qty;
  document.getElementById('cartHeadCount').textContent = `(${qty})`;

  // 2. Порожній кошик — ховаємо список і підсумки
  if (cart.length === 0) {
    itemsBox.innerHTML = '';
    emptyBox.hidden = false;
    footBox.hidden = true;
    return;
  }
  emptyBox.hidden = true;
  footBox.hidden = false;

  // 3. Список позицій
  itemsBox.innerHTML = cart.map((item, index) => {
    const product = getProduct(item.id);
    const color = COLORS[item.color];
    return `
      <div class="ci">
        <img class="ci__ph" src="${product.images[0]}" alt="${product.name}"
             loading="lazy" width="600" height="800">
        <div class="ci__info">
          <p class="ci__name">${product.name}</p>
          <p class="ci__meta">Розмір: ${sizeLabel(item.size)} · Колір: ${color ? color.label : '—'}</p>
          <p class="ci__unit">${formatPrice(product.price)} / шт.</p>
          <div class="ci__bottom">
            <div class="qty">
              <button type="button" data-qty="-1" data-index="${index}" aria-label="Менше">−</button>
              <span>${item.qty}</span>
              <button type="button" data-qty="1" data-index="${index}" aria-label="Більше">+</button>
            </div>
            <span class="ci__sum">${formatPrice(product.price * item.qty)}</span>
          </div>
          <button type="button" class="ci__del" data-remove="${index}">Видалити</button>
        </div>
      </div>
    `;
  }).join('');

  // 4. Підсумки
  const shipping = cartShipping();
  document.getElementById('cartQtyTotal').textContent = qty + ' шт.';
  document.getElementById('cartShipping').textContent =
    shipping === 0 ? 'Безкоштовно' : formatPrice(shipping);
  document.getElementById('cartTotal').textContent = formatPrice(cartTotal());
}

// Легка анімація лічильника при додаванні товару
function bumpCartIcon() {
  const badge = document.getElementById('cartCount');
  badge.classList.add('is-bump');
  setTimeout(() => badge.classList.remove('is-bump'), 220);
}

/* ---------- Відкриття / закриття панелі ---------- */

function openCart() {
  document.getElementById('cartDrawer').classList.add('is-open');
  document.getElementById('overlay').classList.add('is-open');
  document.body.classList.add('is-locked');
}

function closeCart() {
  document.getElementById('cartDrawer').classList.remove('is-open');
  document.getElementById('overlay').classList.remove('is-open');
  document.body.classList.remove('is-locked');
}

/* ---------- Тост-повідомлення ---------- */

let toastTimer = null;
function showToast(text) {
  const toast = document.getElementById('toast');
  toast.textContent = text;
  toast.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-show'), 2400);
}

/* ---------- Події кошика ---------- */

function initCart() {
  document.getElementById('cartOpenBtn').addEventListener('click', openCart);
  document.getElementById('cartCloseBtn').addEventListener('click', closeCart);
  document.getElementById('clearCartBtn').addEventListener('click', () => {
    clearCart();
    showToast('Кошик очищено');
  });

  // Делегування: одна обробка на весь список позицій
  document.getElementById('cartItems').addEventListener('click', (e) => {
    const qtyBtn = e.target.closest('[data-qty]');
    if (qtyBtn) {
      changeQty(Number(qtyBtn.dataset.index), Number(qtyBtn.dataset.qty));
      return;
    }
    const delBtn = e.target.closest('[data-remove]');
    if (delBtn) {
      removeFromCart(Number(delBtn.dataset.remove));
    }
  });

  renderCart();
}
