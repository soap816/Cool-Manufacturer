const SESSION_LENGTH_MS = 1000 * 60 * 60 * 2; // 2 hours

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return toHex(digest);
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

export async function onRequestPost({ request, env }) {
  const headers = { 'Content-Type': 'application/json' };
  const adminPassword = env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return new Response(
      JSON.stringify({ error: "Admin login isn\u2019t set up yet. Add ADMIN_PASSWORD in Cloudflare Pages." }),
      { status: 500, headers },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers });
  }

  const supplied = String(body.password || '');

  // Compare password hashes rather than raw strings, so timing differences reveal nothing useful.
  const [suppliedHash, expectedHash] = await Promise.all([sha256Hex(supplied), sha256Hex(adminPassword)]);
  if (suppliedHash !== expectedHash) {
    return new Response(JSON.stringify({ error: 'Incorrect password' }), { status: 401, headers });
  }

  const expiry = Date.now() + SESSION_LENGTH_MS;
  const key = await importHmacKey(adminPassword);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(String(expiry)));
  const token = `${expiry}.${toHex(signatureBuffer)}`;

  return new Response(JSON.stringify({ token }), { status: 200, headers });
}
