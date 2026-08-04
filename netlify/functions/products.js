const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

const DEFAULTS = {
  deliveryFee: 0,
  products: {
    'milk-cool-pack': {
      price: 12,
      image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80',
    },
    'plain-cool-pack': {
      price: 10,
      image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    },
    'long-cool-pack': {
      price: 40,
      image: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=1200&q=80',
    },
  },
};

const STORE_NAME = 'site-settings';
const STORE_KEY = 'product-overrides';

function isAuthorized(authHeader) {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret || !authHeader) return false;

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const [expiryStr, signature] = token.split('.');
  if (!expiryStr || !signature) return false;

  const expiry = Number(expiryStr);
  if (!expiry || Date.now() > expiry) return false;

  const expected = crypto.createHmac('sha256', secret).update(expiryStr).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

exports.handler = async function (event) {
  const headers = { 'Content-Type': 'application/json' };
  const store = getStore(STORE_NAME);

  if (event.httpMethod === 'GET') {
    const saved = await store.get(STORE_KEY, { type: 'json' });
    return { statusCode: 200, headers, body: JSON.stringify(saved || DEFAULTS) };
  }

  if (event.httpMethod === 'POST') {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!isAuthorized(authHeader)) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authorized' }) };
    }

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) };
    }

    const current = (await store.get(STORE_KEY, { type: 'json' })) || DEFAULTS;
    const allowedIds = Object.keys(DEFAULTS.products);

    const nextProducts = {};
    for (const id of allowedIds) {
      const incoming = (body.products && body.products[id]) || {};
      const existing = current.products?.[id] || DEFAULTS.products[id];
      const price = Number(incoming.price);
      nextProducts[id] = {
        price: Number.isFinite(price) && price > 0 ? price : existing.price,
        image: typeof incoming.image === 'string' && incoming.image.trim() ? incoming.image.trim() : existing.image,
      };
    }

    const deliveryFeeRaw = Number(body.deliveryFee);
    const deliveryFee = Number.isFinite(deliveryFeeRaw) && deliveryFeeRaw >= 0
      ? deliveryFeeRaw
      : (current.deliveryFee ?? DEFAULTS.deliveryFee);

    const next = { deliveryFee, products: nextProducts };
    await store.setJSON(STORE_KEY, next);

    return { statusCode: 200, headers, body: JSON.stringify(next) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
