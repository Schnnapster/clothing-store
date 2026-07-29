/* ============================================================
   catalog.js — КАТАЛОГ: ФІЛЬТРАЦІЯ, СОРТУВАННЯ, QUICK VIEW
   ------------------------------------------------------------
   Логіка працює повністю на клієнті, без перезавантаження:
   1) збираємо стан фільтрів у об'єкт filterState;
   2) прогоняємо масив PRODUCTS через набір перевірок;
   3) сортуємо результат;
   4) перемальовуємо сітку карток.
   ============================================================ */

// Поточний стан фільтрів. Порожні масиви = «фільтр не застосований».
const filterState = {
  categories: [],   // ['tshirts', ...]
  sizes: [],        // ['S','M',...]
  colors: [],       // ['black',...]
  priceMin: null,   // число або null
  priceMax: null,
  search: '',       // рядок пошуку з header
  sort: 'popular',
};

// Межа повзунка ціни — рахуємо з даних, щоб не хардкодити
const MAX_PRICE = Math.max(...PRODUCTS.map(p => p.price));

/* ============================================================
   1. ФІЛЬТРАЦІЯ
   ============================================================ */

/**
 * Перевіряє, чи товар проходить усі активні фільтри.
 * Логіка між різними фільтрами — «І» (усі мають виконатись),
 * логіка всередині одного фільтра — «АБО» (достатньо одного значення).
 */
function matchesFilters(product) {
  // Категорія
  if (filterState.categories.length &&
      !filterState.categories.includes(product.category)) {
    return false;
  }

  // Розмір: достатньо, щоб товар мав хоч один із вибраних розмірів.
  // Аксесуари (розмір 'ONE') не мають S/M/L/XL — тому при активному
  // фільтрі розмірів вони природно відпадають.
  if (filterState.sizes.length &&
      !product.sizes.some(s => filterState.sizes.includes(s))) {
    return false;
  }

  // Колір: аналогічно — хоч один спільний колір
  if (filterState.colors.length &&
      !product.colors.some(c => filterState.colors.includes(c))) {
    return false;
  }

  // Ціновий діапазон
  if (filterState.priceMin !== null && product.price < filterState.priceMin) return false;
  if (filterState.priceMax !== null && product.price > filterState.priceMax) return false;

  // Пошук по назві та опису (без урахування регістру)
  if (filterState.search) {
    const q = filterState.search.toLowerCase();
    const haystack = (product.name + ' ' + product.description).toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  return true;
}

/* ============================================================
   2. СОРТУВАННЯ
   ============================================================ */

function sortProducts(list) {
  const sorted = [...list]; // копія, щоб не мутувати вихідний масив

  switch (filterState.sort) {
    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price);
    case 'new':
      // новіші зверху: порівнюємо дати як рядки 'РРРР-ММ-ДД' — цього достатньо
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'popular':
    default:
      return sorted.sort((a, b) => b.popularity - a.popularity);
  }
}

/* ============================================================
   3. РЕНДЕР СІТКИ
   ============================================================ */

// Розмітка однієї картки товару
function cardTemplate(product) {
  const colorDots = product.colors
    .map(c => `<i style="background:${COLORS[c].hex}" title="${COLORS[c].label}"></i>`)
    .join('');

  const oldPrice = product.oldPrice
    ? `<s class="card__old">${formatPrice(product.oldPrice)}</s>`
    : '';

  const badge = product.badge
    ? `<span class="card__badge">${product.badge}</span>`
    : '';

  return `
    <article class="card" data-id="${product.id}">
      <div class="card__media" data-quick="${product.id}">
        ${badge}
        <div class="card__ph card__ph--front">ФОТО ТОВАРУ</div>
        <div class="card__ph card__ph--back">ФОТО ЗЗАДУ</div>
        <button type="button" class="card__quick">Швидкий перегляд</button>
      </div>
      <span class="card__cat">${CATEGORY_LABELS[product.category]}</span>
      <h3 class="card__name">${product.name}</h3>
      <div class="card__colors">${colorDots}</div>
      <div class="card__foot">
        <span class="card__price">${formatPrice(product.price)}${oldPrice}</span>
        <button type="button" class="card__add" data-add="${product.id}">Додати в кошик</button>
      </div>
    </article>
  `;
}

// Головна функція: фільтр -> сортування -> вивід
function renderCatalog() {
  const grid = document.getElementById('productsGrid');
  const empty = document.getElementById('emptyState');

  const filtered = sortProducts(PRODUCTS.filter(matchesFilters));

  grid.innerHTML = filtered.map(cardTemplate).join('');
  document.getElementById('resultCount').textContent = `Знайдено: ${filtered.length}`;
  empty.hidden = filtered.length > 0;

  renderActiveChips();
}

/* ---------- Чипи активних фільтрів ---------- */

function renderActiveChips() {
  const box = document.getElementById('activeChips');
  const chips = [];

  filterState.categories.forEach(c =>
    chips.push({ type: 'categories', value: c, label: CATEGORY_LABELS[c] }));
  filterState.sizes.forEach(s =>
    chips.push({ type: 'sizes', value: s, label: 'Розмір ' + s }));
  filterState.colors.forEach(c =>
    chips.push({ type: 'colors', value: c, label: COLORS[c].label }));

  if (filterState.priceMin !== null || filterState.priceMax !== null) {
    const from = filterState.priceMin !== null ? filterState.priceMin : 0;
    const to = filterState.priceMax !== null ? filterState.priceMax : MAX_PRICE;
    chips.push({ type: 'price', value: 'price', label: `${from} — ${to} ₴` });
  }

  if (filterState.search) {
    chips.push({ type: 'search', value: 'search', label: `Пошук: «${filterState.search}»` });
  }

  box.innerHTML = chips.map(chip => `
    <span class="chip">${chip.label}
      <button type="button" data-chip-type="${chip.type}" data-chip-value="${chip.value}" aria-label="Прибрати фільтр">×</button>
    </span>
  `).join('');
}

// Прибрати один фільтр через хрестик на чипі
function removeFilter(type, value) {
  if (type === 'price') {
    filterState.priceMin = null;
    filterState.priceMax = null;
    document.getElementById('priceMin').value = '';
    document.getElementById('priceMax').value = '';
    document.getElementById('priceRange').value = MAX_PRICE;
    document.getElementById('priceRangeLabel').textContent = MAX_PRICE;
  } else if (type === 'search') {
    filterState.search = '';
    document.getElementById('searchInput').value = '';
  } else {
    // знімаємо відповідний чекбокс і чистимо масив стану
    filterState[type] = filterState[type].filter(v => v !== value);
    const map = { categories: 'categoryFilters', sizes: 'sizeFilters', colors: 'colorFilters' };
    const input = document.querySelector(`#${map[type]} input[value="${value}"]`);
    if (input) input.checked = false;
  }
  renderCatalog();
}

/* ============================================================
   4. QUICK VIEW — швидкий перегляд товару
   ============================================================ */

// Вибір користувача у вікні швидкого перегляду
let quickSelection = { id: null, size: null, color: null };

function openQuickView(id) {
  const product = getProduct(id);
  if (!product) return;

  // За замовчуванням — перший розмір та перший колір
  quickSelection = { id: product.id, size: product.sizes[0], color: product.colors[0] };

  const sizeChips = product.sizes.map((s, i) => `
    <label class="size-chip">
      <input type="radio" name="qvSize" value="${s}" ${i === 0 ? 'checked' : ''}>
      <span>${s === 'ONE' ? 'ONE SIZE' : s}</span>
    </label>
  `).join('');

  const colorDots = product.colors.map((c, i) => `
    <label class="color-dot" title="${COLORS[c].label}">
      <input type="radio" name="qvColor" value="${c}" ${i === 0 ? 'checked' : ''}>
      <i style="background:${COLORS[c].hex}"></i>
    </label>
  `).join('');

  const oldPrice = product.oldPrice ? `<s>${formatPrice(product.oldPrice)}</s>` : '';

  document.getElementById('quickContent').innerHTML = `
    <div class="quick__media">ФОТО ТОВАРУ</div>
    <div class="quick__info">
      <span class="quick__cat">${CATEGORY_LABELS[product.category]}</span>
      <h3 class="quick__name">${product.name}</h3>
      <p class="quick__price">${formatPrice(product.price)}${oldPrice}</p>
      <p class="quick__desc">${product.description}</p>

      <div class="quick__block">
        <span class="quick__label">Розмір</span>
        <div class="sizes">${sizeChips}</div>
      </div>

      <div class="quick__block">
        <span class="quick__label">Колір</span>
        <div class="colors">${colorDots}</div>
      </div>

      <button type="button" class="btn btn--primary btn--full btn--lg" id="quickAdd">Додати в кошик</button>
      <p class="quick__note">Безкоштовна доставка від ${FREE_SHIPPING_FROM} ₴ · Повернення протягом 14 днів</p>
    </div>
  `;

  const modal = document.getElementById('quickModal');
  modal.classList.add('is-open');
  document.body.classList.add('is-locked');

  // Слухаємо зміну розміру/кольору всередині вікна
  modal.querySelectorAll('input[name="qvSize"]').forEach(input => {
    input.addEventListener('change', () => { quickSelection.size = input.value; });
  });
  modal.querySelectorAll('input[name="qvColor"]').forEach(input => {
    input.addEventListener('change', () => { quickSelection.color = input.value; });
  });

  document.getElementById('quickAdd').addEventListener('click', () => {
    addToCart(quickSelection.id, quickSelection.size, quickSelection.color);
    closeQuickView();
    openCart();
  });
}

function closeQuickView() {
  document.getElementById('quickModal').classList.remove('is-open');
  // не знімаємо блокування скролу, якщо відкритий кошик
  if (!document.getElementById('cartDrawer').classList.contains('is-open')) {
    document.body.classList.remove('is-locked');
  }
}

/* ============================================================
   5. ІНІЦІАЛІЗАЦІЯ ПОДІЙ КАТАЛОГУ
   ============================================================ */

function initCatalog() {
  // --- кольорові кружечки генеруємо з словника COLORS ---
  document.getElementById('colorFilters').innerHTML = Object.keys(COLORS).map(key => `
    <label class="color-dot" title="${COLORS[key].label}">
      <input type="checkbox" value="${key}">
      <i style="background:${COLORS[key].hex}"></i>
    </label>
  `).join('');

  // --- повзунок ціни: максимум беремо з даних ---
  const range = document.getElementById('priceRange');
  const rangeLabel = document.getElementById('priceRangeLabel');
  range.max = MAX_PRICE;
  range.value = MAX_PRICE;
  rangeLabel.textContent = MAX_PRICE;

  // Універсальний збирач стану чекбоксів у масив
  const collect = (containerId) =>
    Array.from(document.querySelectorAll(`#${containerId} input:checked`)).map(i => i.value);

  // --- категорії / розміри / кольори ---
  [['categoryFilters', 'categories'], ['sizeFilters', 'sizes'], ['colorFilters', 'colors']]
    .forEach(([containerId, stateKey]) => {
      document.getElementById(containerId).addEventListener('change', () => {
        filterState[stateKey] = collect(containerId);
        renderCatalog();
      });
    });

  // --- ціна: поля min/max ---
  const priceMinInput = document.getElementById('priceMin');
  const priceMaxInput = document.getElementById('priceMax');

  const applyPriceInputs = () => {
    const min = parseInt(priceMinInput.value, 10);
    const max = parseInt(priceMaxInput.value, 10);
    filterState.priceMin = Number.isNaN(min) ? null : min;
    filterState.priceMax = Number.isNaN(max) ? null : max;
    // синхронізуємо повзунок з полем «до»
    range.value = filterState.priceMax !== null ? Math.min(max, MAX_PRICE) : MAX_PRICE;
    rangeLabel.textContent = range.value;
    renderCatalog();
  };

  priceMinInput.addEventListener('input', applyPriceInputs);
  priceMaxInput.addEventListener('input', applyPriceInputs);

  // --- ціна: повзунок (керує верхньою межею) ---
  range.addEventListener('input', () => {
    rangeLabel.textContent = range.value;
    filterState.priceMax = Number(range.value) >= MAX_PRICE ? null : Number(range.value);
    priceMaxInput.value = filterState.priceMax !== null ? filterState.priceMax : '';
    renderCatalog();
  });

  // --- сортування ---
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    filterState.sort = e.target.value;
    renderCatalog();
  });

  // --- пошук у header (з невеликою затримкою, щоб не рендерити на кожну літеру) ---
  let searchTimer = null;
  document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const value = e.target.value.trim();
    searchTimer = setTimeout(() => {
      filterState.search = value;
      renderCatalog();
    }, 200);
  });

  // --- скидання всіх фільтрів ---
  document.getElementById('resetFilters').addEventListener('click', () => {
    document.querySelectorAll('#filters input[type="checkbox"]').forEach(i => i.checked = false);
    priceMinInput.value = '';
    priceMaxInput.value = '';
    range.value = MAX_PRICE;
    rangeLabel.textContent = MAX_PRICE;
    document.getElementById('searchInput').value = '';

    filterState.categories = [];
    filterState.sizes = [];
    filterState.colors = [];
    filterState.priceMin = null;
    filterState.priceMax = null;
    filterState.search = '';
    renderCatalog();
  });

  // --- чипи активних фільтрів ---
  document.getElementById('activeChips').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-chip-type]');
    if (btn) removeFilter(btn.dataset.chipType, btn.dataset.chipValue);
  });

  // --- клік по сітці: «Додати в кошик» або «Швидкий перегляд» ---
  document.getElementById('productsGrid').addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add]');
    if (addBtn) {
      addToCart(addBtn.dataset.add);
      return;
    }
    const media = e.target.closest('[data-quick]');
    if (media) openQuickView(media.dataset.quick);
  });

  // --- закриття quick view ---
  document.getElementById('quickClose').addEventListener('click', closeQuickView);
  document.getElementById('quickModal').addEventListener('click', (e) => {
    if (e.target.id === 'quickModal') closeQuickView();
  });

  // --- згортання фільтрів на мобільному ---
  document.getElementById('filtersToggle').addEventListener('click', () => {
    document.getElementById('filters').classList.toggle('is-open');
  });

  renderCatalog();
}
