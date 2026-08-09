import * as order from './functions/api/order.js';
import * as adminLogin from './functions/api/admin-login.js';
import * as products from './functions/api/products.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const apiPaths = ['/api/order', '/api/admin-login', '/api/products'];

    if (apiPaths.includes(url.pathname)) {
      if (url.pathname === '/api/order' && request.method === 'POST') {
        return order.onRequestPost({ request, env });
      }

      if (url.pathname === '/api/admin-login' && request.method === 'POST') {
        return adminLogin.onRequestPost({ request, env });
      }

      if (url.pathname === '/api/products') {
        if (request.method === 'GET') return products.onRequestGet({ env });
        if (request.method === 'POST') return products.onRequestPost({ request, env });
      }

      // Known API path, but not a method it supports.
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Not an API route: serve the matching static file (index.html, admin.html, styles.css, etc.)
    return env.ASSETS.fetch(request);
  },
};
