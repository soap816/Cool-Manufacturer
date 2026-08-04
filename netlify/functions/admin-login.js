const crypto = require('crypto');

const SESSION_LENGTH_MS = 1000 * 60 * 60 * 2; // 2 hours

exports.handler = async function (event) {
  const headers = { 'Content-Type': 'application/json' };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Admin login isn\u2019t set up yet. Add ADMIN_PASSWORD in Netlify.' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  const supplied = Buffer.from(String(body.password || ''));
  const expected = Buffer.from(String(adminPassword));

  // Same-length check first: timingSafeEqual throws on mismatched lengths.
  const match = supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
  if (!match) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Incorrect password' }) };
  }

  const expiry = Date.now() + SESSION_LENGTH_MS;
  const signature = crypto.createHmac('sha256', adminPassword).update(String(expiry)).digest('hex');
  const token = `${expiry}.${signature}`;

  return { statusCode: 200, headers, body: JSON.stringify({ token }) };
};
