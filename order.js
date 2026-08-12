async function getMinDeliveryAmount(kv) {
  try {
    const raw = await kv.get('product-overrides');
    if (!raw) return 0;
    const data = JSON.parse(raw);
    return Number.isFinite(data.minDeliveryAmount) ? data.minDeliveryAmount : 0;
  } catch {
    return 0;
  }
}

export async function onRequestPost({ request, env }) {
  const headers = { 'Content-Type': 'application/json' };

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers });
  }

  const { customer, items, payment, delivery, subtotal, deliveryFee, grandTotal, createdAt, source, company } = body;

  // Honeypot: real customers never fill this hidden field. Accept quietly, skip notifications.
  if (company) {
    return new Response(JSON.stringify({ ok: true, notified: false }), { status: 200, headers });
  }

  if (!customer?.name || !customer?.phone || !customer?.address || !Array.isArray(items) || items.length === 0) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers });
  }

  if (delivery === 'delivery') {
    const minDeliveryAmount = await getMinDeliveryAmount(env.SITE_SETTINGS);
    const orderSubtotal = Number(subtotal) || 0;
    if (minDeliveryAmount > 0 && orderSubtotal < minDeliveryAmount) {
      return new Response(
        JSON.stringify({ error: `Delivery requires a minimum order of TT$${minDeliveryAmount.toFixed(2)}` }),
        { status: 400, headers },
      );
    }
  }

  const lines = items.map((item) => `- ${item.qty}x ${item.name} (${item.price} TT)`).join('\n');
  const messageBody = [
    'NEW ORDER',
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

  // Discord supports **bold** markdown, so give it a bold heading. WhatsApp gets the plain version.
  const discordMessage = messageBody.replace('NEW ORDER', '**NEW ORDER**');

  let discordSent = false;
  let whatsappSent = false;
  let whatsappError = null;

  // Discord: only needs a webhook URL.
  if (env.DISCORD_WEBHOOK_URL) {
    try {
      const res = await fetch(env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: discordMessage }),
      });
      discordSent = res.ok;
    } catch {
      discordSent = false;
    }
  }

  // WhatsApp: needs a token, a phone number ID, and a recipient number, all from Meta.
  if (env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID && env.WHATSAPP_RECIPIENT_NUMBER) {
    try {
      const res = await fetch(`https://graph.facebook.com/v23.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: env.WHATSAPP_RECIPIENT_NUMBER,
          type: 'text',
          text: { body: messageBody },
        }),
      });
      whatsappSent = res.ok;
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        whatsappError = errBody?.error?.message || `WhatsApp API returned ${res.status}`;
      }
    } catch (err) {
      whatsappSent = false;
      whatsappError = err.message;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, notified: discordSent || whatsappSent, discordSent, whatsappSent, whatsappError }),
    { status: 200, headers },
  );
}
