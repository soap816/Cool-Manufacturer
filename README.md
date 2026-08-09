# Cool Manufacturer — Cloudflare Pages Site

## Files
- `index.html` — homepage and checkout UI
- `admin.html` — password-protected page to edit prices, images, and delivery fee
- `styles.css` — full design
- `app.js` — product data, cart, and checkout logic
- `admin.js` — admin login and settings form logic
- `functions/api/order.js` — receives orders, sends them to Discord and/or WhatsApp
- `functions/api/admin-login.js` — checks the admin password, issues a session token
- `functions/api/products.js` — stores and returns prices, images, and delivery fee

Everything under `functions/` is a Cloudflare Pages Function. A file at `functions/api/order.js` automatically becomes the endpoint `/api/order`, no extra routing config needed.

---

## Part A: Setting up Cloudflare Pages

### 1. Push this code to GitHub
Delete the old `netlify` folder and `netlify.toml` from your repo if they're still there, they're not used anymore. Add these files in their place, keeping the folder structure exactly as it is (`functions/api/` matters, don't flatten it).

### 2. Create the Cloudflare Pages project
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and log in or sign up (free).
2. In the left sidebar, go to **Workers & Pages**.
3. Click **Create** → **Pages** → **Connect to Git**.
4. Authorize Cloudflare to access GitHub, then pick your repository.
5. On the build settings screen:
   - **Framework preset:** None
   - **Build command:** leave blank
   - **Build output directory:** `/`
6. Click **Save and Deploy**.

Cloudflare builds and deploys the site. You'll get a URL like `cool-manufacturer.pages.dev`. The `/api/*` functions deploy automatically along with it, no separate step.

### 3. Create the KV namespace (for prices, images, delivery fee)
1. In the Cloudflare dashboard, go to **Storage & Databases → KV**.
2. Click **Create a namespace**.
3. Name it something like `cool-manufacturer-settings`. Create it.

### 4. Bind the KV namespace to your Pages project
1. Go back to **Workers & Pages**, open your project.
2. Go to **Settings → Bindings**.
3. Click **Add binding** → **KV namespace**.
4. **Variable name:** `SITE_SETTINGS` (must match exactly, that's what the code looks for).
5. **KV namespace:** select the one you just created.
6. Save.

### 5. Add your environment variables
Still in **Settings**, go to **Environment variables**. Add each of these (as **Secret**, not plain text, since they're sensitive):

| Variable | Value |
|---|---|
| `ADMIN_PASSWORD` | A strong password only you know |
| `DISCORD_WEBHOOK_URL` | Your Discord webhook URL |
| `WHATSAPP_TOKEN` | See Part B below |
| `WHATSAPP_PHONE_NUMBER_ID` | See Part B below |
| `WHATSAPP_RECIPIENT_NUMBER` | See Part B below |

You don't need all of them. Discord works with just `DISCORD_WEBHOOK_URL` set. WhatsApp needs all three of its variables set together, or it's skipped.

### 6. Redeploy
Bindings and environment variables only apply to deployments made after you add them. Go to **Deployments**, click the three dots on the latest one, and **Retry deployment** (or just push a small commit to trigger a fresh one).

### 7. Test it
- Visit your site, place a test order, check Discord (and WhatsApp, if set up) for the alert.
- Visit `yoursite.pages.dev/admin.html`, log in, change a price, save, then reload the homepage and confirm it changed.

---

## Part B: Setting up WhatsApp notifications

Being upfront: this is more involved than Discord. Discord is one URL. WhatsApp requires a Meta developer account and a few setup steps, and it has one real limitation you should know about before relying on it.

### The 24-hour window limitation
WhatsApp's API only lets a business send a free-form text message to someone if that person has messaged the business's WhatsApp number within the last 24 hours. Since these are notifications sent *to* you, that means **you need to send any message to your own WhatsApp Business number at least once a day** for text-message alerts to keep working. If that window closes, the API rejects the message (you'll see `whatsappSent: false` show up in the response, though the order still saves fine either way).

The permanent fix is a Meta-approved **message template**, which can be sent anytime regardless of the window, but templates need to be submitted for review and approved first (usually within a day, sometimes longer). For now, this setup uses a regular text message, which is faster to get working, with this caveat attached. If you want, I can help you set up a template later once you've got the basics running.

### Setup steps
1. Go to [developers.facebook.com](https://developers.facebook.com) and log in with a Facebook account (create a Meta Business account if you don't have one).
2. Click **My Apps → Create App**. Choose **Business** as the app type.
3. Once the app is created, add the **WhatsApp** product to it from the app dashboard.
4. Under **WhatsApp → API Setup**, you'll see:
   - A **temporary access token** (valid 24 hours, fine for testing, you'll need a permanent one later).
   - A **test phone number** with its **Phone number ID** listed underneath.
5. In the same screen, under "To", add your own personal WhatsApp number as a recipient. Meta will text you a verification code, enter it to confirm. Test-mode apps can only message pre-verified numbers like this one.
6. Copy the **Phone number ID** into `WHATSAPP_PHONE_NUMBER_ID`.
7. Copy the **temporary access token** into `WHATSAPP_TOKEN` for now.
8. Set `WHATSAPP_RECIPIENT_NUMBER` to your verified number, in full international format with no `+` and no leading zero, e.g. a Trinidad number `868 123 4567` becomes `18681234567`.

### Going from test to permanent
The temporary token expires in 24 hours. For something you don't have to keep re-generating:
1. In your Meta app, go to **Business Settings → Users → System Users**, create a system user.
2. Assign it the WhatsApp app with `whatsapp_business_messaging` permission.
3. Generate a token for that system user with no expiry.
4. Replace `WHATSAPP_TOKEN` with that value.

You'll also eventually want to register your own business's real phone number instead of Meta's shared test number, which requires business verification through Meta. That's a longer process and only worth doing once you've confirmed the basic flow works for you.

---

## Security note
The admin login is a password check with a temporary signed session, sized for a small site where the worst case is someone changing a price on you. It's not built for anything handling customer payments or personal data. Use a real, unique password.
