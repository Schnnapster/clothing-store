/* ============================================================
   checkout.js — ОФОРМЛЕННЯ ЗАМОВЛЕННЯ
   ------------------------------------------------------------
   Модальне вікно з формою. Реальної відправки на сервер немає:
   після валідації показуємо екран підтвердження з номером
   замовлення та підсумковою сумою, а кошик очищаємо.
   ============================================================ */

const PAYMENT_LABELS = {
  cod: 'Оплата при отриманні',
  card: 'Оплата карткою онлайн',
};

/* ---------- Відкриття / закриття ---------- */

function openCheckout() {
  // Захист: не даємо оформити порожній кошик
  if (cart.length === 0) {
    showToast('Кошик порожній — додайте товари');
    return;
  }

  renderCheckoutSummary();

  // Показуємо форму, ховаємо попередній екран успіху
  document.getElementById('checkoutFormWrap').hidden = false;
  document.getElementById('checkoutSuccess').hidden = true;

  closeCart();
  document.getElementById('checkoutModal').classList.add('is-open');
  document.body.classList.add('is-locked');
}

function closeCheckout() {
  document.getElementById('checkoutModal').classList.remove('is-open');
  document.body.classList.remove('is-locked');
}

/* ---------- Підсумок замовлення у формі ---------- */

function renderCheckoutSummary() {
  const rows = cart.map(item => {
    const product = getProduct(item.id);
    return `
      <div class="summary__row">
        <span>${product.name} · ${sizeLabel(item.size)} × ${item.qty}</span>
        <span>${formatPrice(product.price * item.qty)}</span>
      </div>
    `;
  }).join('');

  const shipping = cartShipping();

  document.getElementById('checkoutSummary').innerHTML = `
    ${rows}
    <div class="summary__row">
      <span>Доставка</span>
      <span>${shipping === 0 ? 'Безкоштовно' : formatPrice(shipping)}</span>
    </div>
    <div class="summary__row summary__row--total">
      <span>До сплати</span>
      <b>${formatPrice(cartTotal())}</b>
    </div>
  `;
}

/* ---------- Валідація ---------- */

// Показати/прибрати текст помилки під полем
function setError(field, message) {
  const input = document.querySelector(`#checkoutForm [name="${field}"]`);
  const box = document.querySelector(`#checkoutForm .err[data-err="${field}"]`);
  if (box) box.textContent = message || '';
  if (input) input.classList.toggle('is-invalid', Boolean(message));
}

/**
 * Перевіряє форму. Повертає true, якщо все гаразд.
 * Адреса обов'язкова лише для доставки — при самовивозі пропускаємо.
 */
function validateCheckout(data) {
  let valid = true;

  ['name', 'phone', 'address'].forEach(f => setError(f, ''));

  if (data.name.trim().length < 2) {
    setError('name', 'Вкажіть ім\'я (мінімум 2 символи)');
    valid = false;
  }

  // Телефон: щонайменше 9 цифр — достатньо для демо
  const digits = data.phone.replace(/\D/g, '');
  if (digits.length < 9) {
    setError('phone', 'Вкажіть коректний номер телефону');
    valid = false;
  }

  if (data.delivery === 'delivery' && data.address.trim().length < 5) {
    setError('address', 'Вкажіть місто та відділення або адресу');
    valid = false;
  }

  return valid;
}

/* ---------- Номер замовлення ---------- */

// Формат: ATL-РРММДД-XXX (три випадкові цифри)
function generateOrderNumber() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const date = String(now.getFullYear()).slice(2) + pad(now.getMonth() + 1) + pad(now.getDate());
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `ATL-${date}-${rand}`;
}

/* ---------- Ініціалізація ---------- */

function initCheckout() {
  document.getElementById('checkoutBtn').addEventListener('click', openCheckout);
  document.getElementById('checkoutClose').addEventListener('click', closeCheckout);
  document.getElementById('successClose').addEventListener('click', closeCheckout);

  // Клік по темному тлу закриває вікно
  document.getElementById('checkoutModal').addEventListener('click', (e) => {
    if (e.target.id === 'checkoutModal') closeCheckout();
  });

  // Перемикання «Доставка / Самовивіз»: ховаємо або показуємо поле адреси
  document.querySelectorAll('#checkoutForm input[name="delivery"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const isPickup = radio.value === 'pickup' && radio.checked;
      document.getElementById('addressField').hidden = isPickup;
      document.getElementById('pickupNote').hidden = !isPickup;
      if (isPickup) setError('address', '');
    });
  });

  // Відправка форми
  document.getElementById('checkoutForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const form = e.target;
    const data = {
      name: form.name.value,
      phone: form.phone.value,
      address: form.address.value,
      delivery: form.querySelector('input[name="delivery"]:checked').value,
      payment: form.querySelector('input[name="payment"]:checked').value,
      comment: form.comment.value,
    };

    if (!validateCheckout(data)) return;

    // Сума фіксується ДО очищення кошика
    const total = cartTotal();
    const orderNumber = generateOrderNumber();

    const deliveryText = data.delivery === 'pickup'
      ? 'Самовивіз: м. Львів, вул. Дорошенка, 12'
      : `Доставка: ${data.address.trim()}`;

    // Екран підтвердження
    document.getElementById('orderNumber').textContent = orderNumber;
    document.getElementById('orderTotal').textContent = formatPrice(total);
    document.getElementById('orderInfo').innerHTML = `
      ${deliveryText}<br>
      ${PAYMENT_LABELS[data.payment]}<br>
      Ми зателефонуємо на ${data.phone.trim()} для підтвердження.
    `;

    document.getElementById('checkoutFormWrap').hidden = true;
    document.getElementById('checkoutSuccess').hidden = false;

    // Замовлення оформлено — кошик більше не потрібен
    clearCart();
    form.reset();
    document.getElementById('addressField').hidden = false;
    document.getElementById('pickupNote').hidden = true;
  });
}
