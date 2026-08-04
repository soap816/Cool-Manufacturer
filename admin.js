const TOKEN_KEY = 'coolmanufacturer_admin_token';
const PRODUCT_IDS = ['milk-cool-pack', 'plain-cool-pack', 'long-cool-pack'];

const els = {
  loginPanel: document.getElementById('loginPanel'),
  editPanel: document.getElementById('editPanel'),
  loginForm: document.getElementById('loginForm'),
  loginNote: document.getElementById('loginNote'),
  settingsForm: document.getElementById('settingsForm'),
  saveNote: document.getElementById('saveNote'),
  saveBtn: document.getElementById('saveBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  deliveryFeeInput: document.getElementById('deliveryFeeInput'),
};

const getToken = () => sessionStorage.getItem(TOKEN_KEY);
const setToken = (token) => sessionStorage.setItem(TOKEN_KEY, token);
const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);

function showEditPanel() {
  els.loginPanel.hidden = true;
  els.editPanel.hidden = false;
}

function showLoginPanel() {
  els.editPanel.hidden = true;
  els.loginPanel.hidden = false;
}

async function loadSettings() {
  const res = await fetch('/.netlify/functions/products');
  if (!res.ok) throw new Error('Could not load current settings');
  return res.json();
}

function fillForm(data) {
  PRODUCT_IDS.forEach((id) => {
    const section = els.settingsForm.querySelector(`[data-product="${id}"]`);
    const product = data.products && data.products[id];
    if (!section || !product) return;
    section.querySelector('input[name="price"]').value = product.price;
    section.querySelector('input[name="image"]').value = product.image;
  });
  els.deliveryFeeInput.value = data.deliveryFee ?? 0;
}

async function init() {
  if (getToken()) {
    try {
      fillForm(await loadSettings());
      showEditPanel();
      return;
    } catch {
      showLoginPanel();
      return;
    }
  }
  // Not logged in yet, but still worth showing current values once they do log in.
  try {
    fillForm(await loadSettings());
  } catch {
    // Fields stay empty until settings can be loaded.
  }
}

els.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  els.loginNote.textContent = 'Checking...';

  const formData = new FormData(els.loginForm);
  try {
    const res = await fetch('/.netlify/functions/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: formData.get('password') }),
    });
    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      els.loginNote.textContent = `${result.error || 'Login failed'} (status ${res.status})`;
      return;
    }

    setToken(result.token);
    els.loginForm.reset();
    els.loginNote.textContent = '';
    fillForm(await loadSettings());
    showEditPanel();
  } catch (err) {
    els.loginNote.textContent = `Could not reach the server: ${err.message}`;
  }
});

els.logoutBtn.addEventListener('click', () => {
  clearToken();
  showLoginPanel();
});

els.settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = getToken();
  if (!token) {
    showLoginPanel();
    return;
  }

  const products = {};
  PRODUCT_IDS.forEach((id) => {
    const section = els.settingsForm.querySelector(`[data-product="${id}"]`);
    products[id] = {
      price: Number(section.querySelector('input[name="price"]').value),
      image: section.querySelector('input[name="image"]').value.trim(),
    };
  });

  const payload = {
    deliveryFee: Number(els.deliveryFeeInput.value),
    products,
  };

  const originalText = els.saveBtn.textContent;
  els.saveBtn.disabled = true;
  els.saveBtn.textContent = 'Saving...';
  els.saveNote.textContent = '';

  try {
    const res = await fetch('/.netlify/functions/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      clearToken();
      showLoginPanel();
      els.loginNote.textContent = 'Your session expired. Please log in again.';
      return;
    }

    if (!res.ok) throw new Error(`Save failed (status ${res.status})`);

    els.saveNote.textContent = 'Saved. Changes are live on the site now.';
  } catch (err) {
    els.saveNote.textContent = `Something went wrong: ${err.message}`;
  } finally {
    els.saveBtn.disabled = false;
    els.saveBtn.textContent = originalText;
  }
});

init();
