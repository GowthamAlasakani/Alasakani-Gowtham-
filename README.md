# QR Coupon App

Customers scan a QR code, register (name + phone), and instantly get a coupon:
**10% off a purchase of $30+**, usable **in-store or by phone order**.

## How it works
1. Print the poster at `/poster` (or download `/qr.png` / `/qr.svg`) and display it in the store.
2. Customer scans → registers → gets a code like `SAVE-N3MNYW` (valid 30 days, one per phone number).
3. At checkout (or on the phone) staff go to `/staff`, enter the code or the customer's phone number,
   type the purchase total, pick *In-store* or *Phone order*, and the app checks the $30 minimum,
   shows the discount, and marks the coupon used so it can't be reused.
4. `/staff/export.csv` downloads all sign-ups (handy for marketing).

## Run
```
npm install
BASE_URL=https://your-domain.com STAFF_PIN=123456 npm start
```
`BASE_URL` must be the public address customers reach — it is what the QR code encodes.
Optional: `PORT` (3000), `DATA_FILE` (`data/coupons.json`), `SESSION_SECRET`.
If `STAFF_PIN` is not set, a random PIN is printed at startup.

## Branding
Defaults are Nawabi Hyderabad House, Lake Mary (name, tagline, address, phone — see `lib/brand.js`; address and phone match the HH Catering app). The logo is already in `public/logo.jpg`.
Override any with `BUSINESS_NAME`, `BUSINESS_TAGLINE`, `BUSINESS_ADDRESS`, `BUSINESS_PHONE`, and optionally `BUSINESS_WEBSITE`, `BUSINESS_HOURS` (shown only when set).
**Logo:** to change it, save your logo as `public/logo.png` (or `.jpg`, `.svg`, `.webp`) and restart — it appears on the sign-up page and poster.

Test: `npm test`. Deploy anywhere that runs Node 18+ (Render, Railway, Fly, a VPS); keep `data/` on a persistent disk.
