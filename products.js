const DEFAULTS = {
  deliveryFee: 0,
  minDeliveryAmount: 0,
  products: {
    'milk-cool-pack': { price: 12 },
    'plain-cool-pack': { price: 10 },
    'long-cool-pack': { price: 40 },
  },
};

const STORE_KEY = 'product-overrides';

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  return bytes;
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

async function isAuthorized(secret, authHeader) {
  if (!secret || !authHeader) return false;

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const [expiryStr, signature] = token.split('.');
  if (!expiryStr || !signature) return false;

  const expiry = Number(expiryStr);
  if (!expiry || Date.now() > expiry) return false;

  try {
    const key = await importHmacKey(secret);
    return await crypto.subtle.verify('HMAC', key, hexToBytes(signature), new TextEncoder().encode(expiryStr));
  } catch {
    return false;
  }
}

async function readStore(kv) {
  const raw = await kv.get(STORE_KEY);
  return raw ? JSON.parse(raw) : DEFAULTS;
}

export async function onRequestGet({ env }) {
  const headers = { 'Content-Type': 'application/json' };
  const data = await readStore(env.SITE_SETTINGS);
  return new Response(JSON.stringify(data), { status: 200, headers });
}

export async function onRequestPost({ request, env }) {
  const headers = { 'Content-Type': 'application/json' };

  if (!(await isAuthorized(env.ADMIN_PASSWORD, request.headers.get('Authorization')))) {
    return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 401, headers });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers });
  }

  const current = await readStore(env.SITE_SETTINGS);
  const allowedIds = Object.keys(DEFAULTS.products);

  const nextProducts = {};
  for (const id of allowedIds) {
    const incoming = (body.products && body.products[id]) || {};
    const existing = current.products?.[id] || DEFAULTS.products[id];
    const price = Number(incoming.price);
    nextProducts[id] = {
      price: Number.isFinite(price) && price > 0 ? price : existing.price,
    };
  }

  const deliveryFeeRaw = Number(body.deliveryFee);
  const deliveryFee = Number.isFinite(deliveryFeeRaw) && deliveryFeeRaw >= 0
    ? deliveryFeeRaw
    : (current.deliveryFee ?? DEFAULTS.deliveryFee);

  const minDeliveryRaw = Number(body.minDeliveryAmount);
  const minDeliveryAmount = Number.isFinite(minDeliveryRaw) && minDeliveryRaw >= 0
    ? minDeliveryRaw
    : (current.minDeliveryAmount ?? DEFAULTS.minDeliveryAmount);

  const next = { deliveryFee, minDeliveryAmount, products: nextProducts };
  await env.SITE_SETTINGS.put(STORE_KEY, JSON.stringify(next));

  return new Response(JSON.stringify(next), { status: 200, headers });
}
