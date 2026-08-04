# Cool Manufacturer Netlify Site

## Files
- `index.html` — homepage and checkout UI
- `styles.css` — full design
- `app.js` — product data, cart, and checkout logic
- `netlify.toml` — Netlify build and redirect settings
- `netlify/functions/order.js` — order webhook function

Your `netlify.toml` points to `netlify/functions` for the functions folder, so `order.js` needs to live at that exact path in your repo: `netlify/functions/order.js`, not at the root. That's fixed in this version.

## Netlify setup
1. Create a GitHub repository and upload these files, keeping the folder structure above (`netlify/functions/order.js`).
2. Go to Netlify and choose **Add new project** → **Import an existing project**.
3. Connect your GitHub repo.
4. Netlify should detect the settings from `netlify.toml`.
5. Deploy the site first, then add your Discord webhook (see below).

## Adding your Discord webhook
Do this in the Netlify dashboard, not in your code. A webhook URL is a secret — if it ends up in a public GitHub repo, anyone who finds it can post spam to your channel.

1. In Netlify, open your site.
2. Go to **Site configuration → Environment variables**.
3. Click **Add a variable**.
4. Key: `DISCORD_WEBHOOK_URL`
5. Value: paste your webhook URL.
6. Save, then trigger a new deploy (**Deploys → Trigger deploy → Deploy site**) so the function picks up the variable.

Once that's set, every order submitted on the site posts straight to your Discord channel.

## What the function does
The order form sends JSON to `/.netlify/functions/order`. The function validates the required fields, builds a formatted message, and posts it to your Discord webhook if `DISCORD_WEBHOOK_URL` is set. It also checks a hidden honeypot field and quietly ignores anything that fills it in, since that's almost always a bot.

## What changed in this update
- **Fixed function path.** `order.js` now sits at `netlify/functions/order.js`, matching `netlify.toml`. Previously it wouldn't have been picked up as a function at all.
- **Cart persistence.** The cart now saves to the browser's local storage, so it survives a page refresh or an accidental tab close.
- **Spam protection.** A hidden honeypot field on the order form is checked both client-side and server-side.
- **Better submit feedback.** The send button disables and shows "Sending order..." while the request is in flight, so people can't double-submit.
- **Floating cart summary.** Once someone adds a product, a small pill appears showing item count and total, linking straight to checkout.
- **Empty search state.** Searching for something that doesn't exist now shows a message instead of a blank grid.
- **Open Graph tags.** Links to your site shared on WhatsApp, Facebook, or elsewhere now show a title, description, and image preview instead of a bare link.
- **Minor accessibility fixes.** Labeled the search input, added `aria-label`s to the cart +/− buttons, and added visible focus outlines for keyboard users.

## Admin panel: edit prices, images, and delivery fee
There's a password-protected page at `/admin.html` where you can update each product's price and image, plus your delivery fee, without touching any code. Changes apply to the live site for every visitor right away.

### Setup
1. In Netlify, go to **Site configuration → Environment variables**.
2. Add a variable: key `ADMIN_PASSWORD`, value a password only you know. Pick something you wouldn't reuse elsewhere.
3. Deploy (or redeploy) the site.
4. Go to `yoursite.netlify.app/admin.html`, log in, and edit away.

### How it works
Product data (price and image) and the delivery fee are stored using Netlify Blobs, which is built into your Netlify project and needs no extra database setup. The `package.json` in this project lists it as a dependency, and Netlify installs it automatically at deploy time. `app.js` fetches these values on every page load, so if nothing has been saved yet, the site just uses the defaults already baked into the code.

Logging in gives you a temporary session (2 hours) rather than storing your password in the browser. Only the price and image for each of the three products can be changed this way, along with the delivery fee. Names, descriptions, and bullet points still live in `app.js` and need a code change to update.

### A note on security
This is intentionally simple, sized for a small site where the worst case of someone getting in is a wrong price or picture, not stolen customer data or payments. It's password-only, with no rate limiting on login attempts, so use a genuinely strong, unique password. Don't reuse this pattern for anything that touches customer data or payment details.

## Publish options
You can also use Netlify's drag-and-drop deploy for simple static sites, or deploy from a repository for continuous deployment.

## Notes
- Discord webhook support is ready — just add the environment variable above.
- WhatsApp and Messenger usually require an approved API or an automation bridge.
- The delivery fee is set to `TT$0` in `app.js` (the `DELIVERY_FEE` constant near the top). Change that number if you want to charge for delivery.
