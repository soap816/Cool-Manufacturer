exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  const { customer, items, payment, delivery, subtotal, deliveryFee, grandTotal, createdAt, source, company } = body;

  // Honeypot: real customers never fill this hidden field. Accept quietly, skip the webhook.
  if (company) {
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, notified: false }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  if (!customer?.name || !customer?.phone || !customer?.address || !Array.isArray(items) || items.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields' }),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  const lines = items.map((item) => `- ${item.qty}x ${item.name} (${item.price} TT)`).join('\n');
  const message = [
    '**NEW ORDER**',
    `Source: ${source || 'Website'}`,
    `Time: ${createdAt || new Date().toISOString()}`,
    '',
    `Customer: ${customer.name}`,
    `Phone: ${customer.phone}`,
    `Address: ${customer.address}`,
    `Delivery: ${delivery}`,
    `Payment: ${payment}`,
    '',
    'Items:',
    lines,
    '',
    `Subtotal: TT$${Number(subtotal || 0).toFixed(2)}`,
    `Delivery Fee: TT$${Number(deliveryFee || 0).toFixed(2)}`,
    `Grand Total: TT$${Number(grandTotal || 0).toFixed(2)}`,
  ].join('\n');

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  let notified = false;

  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      });
      notified = true;
    } catch (err) {
      return {
        statusCode: 502,
        body: JSON.stringify({ ok: false, error: 'Webhook failed', details: String(err.message || err) }),
        headers: { 'Content-Type': 'application/json' },
      };
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, notified }),
    headers: { 'Content-Type': 'application/json' },
  };
};
