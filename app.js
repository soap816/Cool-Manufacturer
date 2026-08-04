const products = [
  {
    id: 'milk-cool-pack',
    name: 'Milk Cool Pack',
    price: 12,
    category: 'Milk Cools',
    tag: '15 pack',
    description: '5 Coconut, 5 Strawberry, 5 Pineapple.',
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80',
    bullets: ['15 milk cools', 'Mixed flavours', 'Great for families'],
  },
  {
    id: 'plain-cool-pack',
    name: 'Plain Cool Pack',
    price: 10,
    category: 'Plain Cools',
    tag: '15 pack',
    description: '3 Lime, 3 Red Champagne, 3 Orange, 3 Blueberry, 3 Cream Soda.',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    bullets: ['15 plain cools', 'Balanced mix', 'Popular everyday pack'],
  },
  {
    id: 'long-cool-pack',
    name: 'Long Cool Pack',
    price: 40,
    category: 'Long Cools',
    tag: '50 pack',
    description: 'Mix of Lime, Red Champagne, Orange, Blueberry, Pineapple, and Cream Soda.',
    image: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=1200&q=80',
    bullets: ['50 long cools', 'Custom mix', 'Best for events'],
  },
];

// Default delivery fee. Gets overridden by whatever is saved in the admin panel, if anything.
let DELIVERY_FEE = 0;

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
  cartFloat: document.getElementById('cartFloat'),
  cartFloatCount: document.getElementById('cartFloatCount'),
  cartFloatTotal: document.getElementById('cartFloatTotal'),
};

const currency = (n) => `TT$${Number(n).toFixed(2)}`;

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
  else state.cart.push({ ...product, qty: 1 });
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
      <div class="product-image" style="background-image:url('${p.image}')">
        <span class="badge">${p.tag}</span>
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
  const grandTotal = subtotal + DELIVERY_FEE;

  els.subtotal.textContent = currency(subtotal);
  els.deliveryFee.textContent = currency(DELIVERY_FEE);
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

els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.cart.length) {
    els.formNote.textContent = 'Please add at least one product to the cart first.';
    return;
  }

  const formData = new FormData(els.form);

  // Honeypot: real visitors never fill this hidden field, bots often do.
  if (formData.get('company')) {
    els.form.reset();
    state.cart = [];
    renderCart();
    els.formNote.textContent = 'Order sent successfully. We\u2019ll be in touch shortly.';
    return;
  }

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
    subtotal: state.cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    deliveryFee: DELIVERY_FEE,
    grandTotal: state.cart.reduce((sum, item) => sum + item.price * item.qty, 0) + DELIVERY_FEE,
    createdAt: new Date().toISOString(),
    source: 'Cool Manufacturer Website',
  };

  const originalBtnText = els.submitBtn.textContent;
  els.submitBtn.disabled = true;
  els.submitBtn.textContent = 'Sending order...';
  els.formNote.textContent = '';

  try {
    const res = await fetch('/.netlify/functions/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    if (!res.ok) throw new Error('Order failed');

    const result = await res.json().catch(() => ({}));
    if (!result.notified) {
      console.warn('Order saved, but DISCORD_WEBHOOK_URL is not set in Netlify yet, so no alert was sent.');
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
    const res = await fetch('/.netlify/functions/products');
    if (!res.ok) return;
    const data = await res.json();

    if (data.products) {
      products.forEach((p) => {
        const override = data.products[p.id];
        if (!override) return;
        if (Number.isFinite(override.price)) p.price = override.price;
        if (typeof override.image === 'string' && override.image) p.image = override.image;
      });
    }

    if (Number.isFinite(data.deliveryFee)) {
      DELIVERY_FEE = data.deliveryFee;
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
