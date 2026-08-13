const products = [
  {
    id: 'milk-cool-pack',
    name: 'Milk Cool Pack',
    price: 12,
    category: 'Milk Cools',
    tag: '15 pack',
    description: '5 Coconut, 5 Strawberry, 5 Pineapple.',
    bullets: ['15 milk cools', 'Mixed flavours', 'Great for families'],
    art: { flavors: [
      { color: '#FFF6EA', dot: '#C9A15A' },
      { color: '#FFB3C6', dot: '#E8637F' },
      { color: '#FFC98F', dot: '#E8934A' },
    ], tubeW: 28, gap: 10, tubeH: 118, bg: '#FFE9D6' },
  },
  {
    id: 'plain-cool-pack',
    name: 'Plain Cool Pack',
    price: 10,
    category: 'Plain Cools',
    tag: '15 pack',
    description: 'Lime, Red Champagne, Orange, Blueberry, Cream Soda.',
    bullets: ['15 plain cools', 'Balanced mix', 'Popular everyday pack'],
    art: { flavors: [
      { color: '#A8D93B', dot: '#6E9A1F' },
      { color: '#E4536B', dot: '#A9314A' },
      { color: '#FFA53D', dot: '#C97418' },
      { color: '#6C63D6', dot: '#453CA8' },
      { color: '#E8C9A0', dot: '#B08A54' },
    ], tubeW: 18, gap: 7, tubeH: 112, bg: '#E4F7F0' },
  },
  {
    id: 'long-cool-pack',
    name: 'Long Cool Pack',
    price: 40,
    category: 'Long Cools',
    tag: '50 pack',
    description: 'Lime, Red Champagne, Orange, Blueberry, Cream Soda.',
    bullets: ['50 long cools', 'Custom mix', 'Best for events'],
    art: { flavors: [
      { color: '#A8D93B', dot: '#6E9A1F' },
      { color: '#E4536B', dot: '#A9314A' },
      { color: '#FFA53D', dot: '#C97418' },
      { color: '#6C63D6', dot: '#453CA8' },
      { color: '#E8C9A0', dot: '#B08A54' },
    ], tubeW: 14, gap: 8, tubeH: 148, bg: '#F1EAFE' },
  },
];

// Default delivery fee. Gets overridden by whatever is saved in the admin panel, if anything.
let DELIVERY_FEE = 0;
let MIN_DELIVERY_AMOUNT = 0;

const CART_STORAGE_KEY = 'coolmanufacturer_cart_v1';

function loadCart() {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cart));
  } catch {
    // Private browsing or storage disabled. Cart still works for this session.
  }
}

const state = {
  filter: 'All',
  search: '',
  cart: loadCart(),
};

const els = {
  filters: document.getElementById('filters'),
  grid: document.getElementById('productGrid'),
  search: document.getElementById('search'),
  cartItems: document.getElementById('cartItems'),
  subtotal: document.getElementById('subtotal'),
  deliveryFee: document.getElementById('deliveryFee'),
  grandTotal: document.getElementById('grandTotal'),
  form: document.getElementById('orderForm'),
  formNote: document.getElementById('formNote'),
  submitBtn: document.getElementById('orderSubmitBtn'),
  deliverySelect: document.getElementById('deliverySelect'),
  deliveryHint: document.getElementById('deliveryHint'),
  cartFloat: document.getElementById('cartFloat'),
  cartFloatCount: document.getElementById('cartFloatCount'),
  cartFloatTotal: document.getElementById('cartFloatTotal'),
};

const currency = (n) => `TT$${Number(n).toFixed(2)}`;

function tubesSvg(art) {
  const { flavors, tubeW, gap, tubeH } = art;
  const count = flavors.length;
  const totalW = count * tubeW + (count - 1) * gap;
  const svgW = totalW + 20;
  const svgH = tubeH + 24;
  const startX = 10;
  const topY = 12;

  const parts = [];
  flavors.forEach((flavor, i) => {
    const x = startX + i * (tubeW + gap);
    const cx = x + tubeW / 2;
    const rx = tubeW / 2;

    parts.push(`<ellipse cx="${cx}" cy="${topY - 2}" rx="${rx * 0.5}" ry="4" fill="${flavor.color}"/>`);
    parts.push(`<rect x="${x}" y="${topY}" width="${tubeW}" height="${tubeH}" rx="${rx}" fill="${flavor.color}"/>`);
    parts.push(`<ellipse cx="${cx}" cy="${topY + tubeH + 2}" rx="${rx * 0.45}" ry="3.5" fill="${flavor.color}"/>`);
    parts.push(`<rect x="${x + rx * 0.35}" y="${topY + 3}" width="${rx * 0.5}" height="${tubeH * 0.5}" rx="${rx * 0.25}" fill="#ffffff" opacity="0.25"/>`);
    parts.push(`<rect x="${x + 2}" y="${topY + tubeH * 0.24}" width="${tubeW - 4}" height="${tubeH * 0.15}" rx="3" fill="#ffffff" opacity="0.92"/>`);
    parts.push(`<circle cx="${cx}" cy="${topY + tubeH * 0.24 + (tubeH * 0.15) / 2}" r="${Math.max(2, rx * 0.22)}" fill="${flavor.dot}"/>`);
  });

  return `<svg width="100%" height="100%" viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Illustration of ${count} ice pop flavours">${parts.join('')}</svg>`;
}

function categories() {
  return ['All', ...new Set(products.map((p) => p.category))];
}

function filteredProducts() {
  return products.filter((p) => {
    const matchFilter = state.filter === 'All' || p.category === state.filter;
    const q = state.search.trim().toLowerCase();
    const matchSearch = !q || [p.name, p.description, p.category].join(' ').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });
}

function addToCart(product) {
  const existing = state.cart.find((item) => item.id === product.id);
  if (existing) existing.qty += 1;
  else state.cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
  renderCart();
}

function updateQty(id, delta) {
  state.cart = state.cart
    .map((item) => item.id === id ? { ...item, qty: item.qty + delta } : item)
    .filter((item) => item.qty > 0);
  renderCart();
}

function renderFilters() {
  els.filters.innerHTML = categories().map((cat) => `
    <button class="filter-btn ${cat === state.filter ? 'active' : ''}" data-filter="${cat}">${cat}</button>
  `).join('');

  els.filters.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      renderFilters();
      renderProducts();
    });
  });
}

function renderProducts() {
  const items = filteredProducts();

  if (!items.length) {
    els.grid.innerHTML = '<div class="empty-state">No products match your search. Try a different term or filter.</div>';
    return;
  }

  els.grid.innerHTML = items.map((p) => `
    <article class="product-card">
      <div class="product-image" style="background:${p.art.bg}">
        <span class="badge">${p.tag}</span>
        ${tubesSvg(p.art)}
      </div>
      <div class="product-content">
        <h4>${p.name}</h4>
        <p>${p.description}</p>
        <ul>${p.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>
        <div class="product-footer">
          <div>
            <div class="price">${currency(p.price)}</div>
            <small style="color:var(--muted)">${p.category}</small>
          </div>
          <button class="small-btn" data-add="${p.id}">Add to cart</button>
        </div>
      </div>
    </article>
  `).join('');

  els.grid.querySelectorAll('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const product = products.find((p) => p.id === btn.dataset.add);
      addToCart(product);
    });
  });
}

function updateDeliveryAvailability(subtotal) {
  const deliveryOption = els.deliverySelect.querySelector('option[value="delivery"]');
  const meetsMin = subtotal >= MIN_DELIVERY_AMOUNT;

  if (MIN_DELIVERY_AMOUNT > 0 && !meetsMin) {
    deliveryOption.disabled = true;
    const remaining = MIN_DELIVERY_AMOUNT - subtotal;
    els.deliveryHint.textContent = `Delivery is available on orders of ${currency(MIN_DELIVERY_AMOUNT)} or more. Add ${currency(remaining)} more, or choose pickup.`;
    if (els.deliverySelect.value === 'delivery') {
      els.deliverySelect.value = 'pickup';
    }
  } else {
    deliveryOption.disabled = false;
    els.deliveryHint.textContent = '';
  }
}

function renderCart() {
  els.cartItems.innerHTML = state.cart.length
    ? state.cart.map((item) => `
      <div class="cart-item">
        <div>
          <strong>${item.name}</strong>
          <div style="color:var(--muted);margin-top:4px">${currency(item.price)} each</div>
        </div>
        <div class="qty">
          <button data-minus="${item.id}" aria-label="Remove one ${item.name}">−</button>
          <strong>${item.qty}</strong>
          <button data-plus="${item.id}" aria-label="Add one more ${item.name}">+</button>
        </div>
      </div>
    `).join('')
    : '<div style="color:var(--muted);padding:14px 0">Your cart is empty. Add a product above.</div>';

  els.cartItems.querySelectorAll('[data-minus]').forEach((btn) => btn.addEventListener('click', () => updateQty(btn.dataset.minus, -1)));
  els.cartItems.querySelectorAll('[data-plus]').forEach((btn) => btn.addEventListener('click', () => updateQty(btn.dataset.plus, 1)));

  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  updateDeliveryAvailability(subtotal);

  const deliveryFeeApplied = els.deliverySelect.value === 'delivery' ? DELIVERY_FEE : 0;
  const grandTotal = subtotal + deliveryFeeApplied;

  els.subtotal.textContent = currency(subtotal);
  els.deliveryFee.textContent = currency(deliveryFeeApplied);
  els.grandTotal.textContent = currency(grandTotal);

  const totalItems = state.cart.reduce((sum, item) => sum + item.qty, 0);
  if (totalItems > 0) {
    els.cartFloat.classList.add('visible');
    els.cartFloatCount.textContent = totalItems;
    els.cartFloatTotal.textContent = currency(grandTotal);
  } else {
    els.cartFloat.classList.remove('visible');
  }

  saveCart();
}

els.search.addEventListener('input', (e) => {
  state.search = e.target.value;
  renderProducts();
});

els.deliverySelect.addEventListener('change', renderCart);

els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.cart.length) {
    els.formNote.textContent = 'Please add at least one product to the cart first.';
    return;
  }

  const subtotalCheck = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  if (els.deliverySelect.value === 'delivery' && MIN_DELIVERY_AMOUNT > 0 && subtotalCheck < MIN_DELIVERY_AMOUNT) {
    els.formNote.textContent = `Delivery requires a minimum order of ${currency(MIN_DELIVERY_AMOUNT)}. Please choose pickup or add more to your cart.`;
    return;
  }

  const formData = new FormData(els.form);

  if (formData.get('company')) {
    els.form.reset();
    state.cart = [];
    renderCart();
    els.formNote.textContent = 'Order sent successfully. We\u2019ll be in touch shortly.';
    return;
  }

  const submittedSubtotal = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const submittedDeliveryFee = formData.get('delivery') === 'delivery' ? DELIVERY_FEE : 0;

  const order = {
    customer: {
      name: formData.get('name'),
      phone: formData.get('phone'),
      address: formData.get('address'),
    },
    payment: formData.get('payment'),
    delivery: formData.get('delivery'),
    company: formData.get('company'),
    items: state.cart,
    subtotal: submittedSubtotal,
    deliveryFee: submittedDeliveryFee,
    grandTotal: submittedSubtotal + submittedDeliveryFee,
    createdAt: new Date().toISOString(),
    source: 'Cool Manufacturer Website',
  };

  const originalBtnText = els.submitBtn.textContent;
  els.submitBtn.disabled = true;
  els.submitBtn.textContent = 'Sending order...';
  els.formNote.textContent = '';

  try {
    const res = await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    if (!res.ok) throw new Error('Order failed');

    const result = await res.json().catch(() => ({}));
    if (!result.notified) {
      console.warn('Order saved, but no notification channel is set up yet (Discord or WhatsApp).');
    }

    state.cart = [];
    renderCart();
    els.form.reset();
    els.formNote.textContent = 'Order sent successfully. We\u2019ll be in touch shortly to confirm.';
  } catch (err) {
    els.formNote.textContent = 'Something went wrong sending your order. Please try again or contact us directly.';
  } finally {
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = originalBtnText;
  }
});

async function applyStoredSettings() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) return;
    const data = await res.json();

    if (data.products) {
      products.forEach((p) => {
        const override = data.products[p.id];
        if (!override) return;
        if (Number.isFinite(override.price)) p.price = override.price;
      });
    }

    if (Number.isFinite(data.deliveryFee)) {
      DELIVERY_FEE = data.deliveryFee;
    }

    if (Number.isFinite(data.minDeliveryAmount)) {
      MIN_DELIVERY_AMOUNT = data.minDeliveryAmount;
    }
  } catch {
    // No connection or the function isn't deployed yet. Stick with the defaults above.
  }
}

async function init() {
  await applyStoredSettings();
  renderFilters();
  renderProducts();
  renderCart();
}

init();
