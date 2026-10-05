const http = require('http');
const crypto = require('crypto');
const path = require('path');
const QRCode = require('qrcode');
const { Store } = require('./lib/store');
const v = require('./lib/views');

const PORT = process.env.PORT || 3000;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const STAFF_PIN = process.env.STAFF_PIN || crypto.randomInt(100000, 999999).toString();
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const store = new Store(process.env.DATA_FILE || path.join(__dirname, 'data', 'coupons.json'));

const sign = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('hex');
const safeEq = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const cookies = (req) => Object.fromEntries((req.headers.cookie || '').split(/;\s*/).filter(Boolean).map((p) => { const i = p.indexOf('='); return [p.slice(0, i), p.slice(i + 1)]; }));
const isStaff = (req) => { const t = cookies(req).staff || ''; const [exp, sig] = t.split('.'); return !!sig && Number(exp) > Date.now() && safeEq(sig, sign(exp)); };

const attempts = new Map(); // ip -> {n, reset}
function tooMany(ip) {
  const now = Date.now(); const a = attempts.get(ip);
  if (!a || a.reset < now) { attempts.set(ip, { n: 1, reset: now + 15 * 60e3 }); return false; }
  return ++a.n > 8;
}

function body(req) {
  return new Promise((resolve, reject) => {
    let d = ''; req.on('data', (c) => { d += c; if (d.length > 1e5) { reject(new Error('Too large')); req.destroy(); } });
    req.on('end', () => resolve(Object.fromEntries(new URLSearchParams(d))));
  });
}
const send = (res, code, html, headers = {}) => { res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', ...headers }); res.end(html); };
const redirect = (res, to, headers = {}) => { res.writeHead(303, { Location: to, ...headers }); res.end(); };
const qrOpts = { margin: 1, width: 360, errorCorrectionLevel: 'M' };

async function handle(req, res) {
  const url = new URL(req.url, BASE_URL);
  const p = url.pathname; const m = req.method;

  if (m === 'GET' && p === '/') return send(res, 200, v.registerPage());
  if (m === 'GET' && p === '/qr.svg') { res.writeHead(200, { 'Content-Type': 'image/svg+xml' }); return res.end(await QRCode.toString(BASE_URL + '/', { ...qrOpts, type: 'svg' })); }
  if (m === 'GET' && p === '/qr.png') { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(await QRCode.toBuffer(BASE_URL + '/', { ...qrOpts, width: 1000 })); }
  if (m === 'GET' && p === '/poster') return send(res, 200, v.posterPage(BASE_URL + '/', await QRCode.toString(BASE_URL + '/', { ...qrOpts, type: 'svg' })));

  if (m === 'POST' && p === '/register') {
    const f = await body(req);
    try {
      const { coupon, existing } = store.register(f);
      return redirect(res, `/coupon/${coupon.code}${existing ? '?existing=1' : ''}`);
    } catch (e) { return send(res, 400, v.registerPage(e.message, f)); }
  }
  if (m === 'GET' && p === '/coupon') return send(res, 200, v.lookupPage());
  if (m === 'POST' && p === '/coupon') {
    const f = await body(req); const c = store.findByPhone(f.phone);
    return c ? redirect(res, `/coupon/${c.code}?existing=1`) : send(res, 404, v.lookupPage('No coupon found for that number.'));
  }
  let mm;
  if (m === 'GET' && (mm = p.match(/^\/coupon\/([A-Za-z0-9-]+)$/))) {
    const c = store.find(mm[1]);
    if (!c) return send(res, 404, v.lookupPage('Coupon not found.'));
    const qr = await QRCode.toDataURL(c.code, { margin: 1, width: 180 });
    return send(res, 200, v.couponPage(c, store.status(c), url.searchParams.has('existing'), qr));
  }

  // ---- staff ----
  if (p === '/staff/login' && m === 'POST') {
    if (tooMany(req.socket.remoteAddress)) return send(res, 429, v.staffLogin('Too many attempts. Try again later.'));
    const f = await body(req);
    if (!safeEq(sign(String(f.pin || '')), sign(STAFF_PIN))) return send(res, 401, v.staffLogin('Wrong PIN.'));
    const exp = Date.now() + 12 * 3600e3;
    return redirect(res, '/staff', { 'Set-Cookie': `staff=${exp}.${sign(String(exp))}; HttpOnly; SameSite=Strict; Path=/staff; Max-Age=43200${BASE_URL.startsWith('https') ? '; Secure' : ''}` });
  }
  if (p.startsWith('/staff')) {
    if (!isStaff(req)) return send(res, 401, v.staffLogin());
    if (m === 'GET' && p === '/staff') return send(res, 200, v.staffPage({ recent: store.list() }));
    if (m === 'GET' && p === '/staff/export.csv') {
      const q = (s) => `"${String(s ?? '').replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`;
      const rows = [['code', 'name', 'phone', 'email', 'created', 'expires', 'redeemed', 'channel', 'purchase', 'discount'],
        ...store.list().map((c) => [c.code, c.name, c.phone, c.email, c.createdAt, c.expiresAt, c.redeemedAt, c.channel, c.purchaseAmount, c.discount])];
      res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="coupons.csv"' });
      return res.end(rows.map((r) => r.map(q).join(',')).join('\n'));
    }
    if (m === 'POST' && p === '/staff/lookup') {
      const f = await body(req); const q = String(f.q || '').trim();
      const c = store.find(q) || store.findByPhone(q);
      return c ? send(res, 200, v.staffPage({ found: c, status: store.status(c), recent: store.list() }))
               : send(res, 404, v.staffPage({ error: 'No coupon found.', recent: store.list() }));
    }
    if (m === 'POST' && p === '/staff/redeem') {
      const f = await body(req);
      try {
        const c = store.redeem(f.code, f.amount, f.channel);
        return send(res, 200, v.staffPage({ message: `Redeemed ${c.code}: take $${c.discount.toFixed(2)} off $${c.purchaseAmount.toFixed(2)} (${c.channel}). Customer pays $${(c.purchaseAmount - c.discount).toFixed(2)}.`, recent: store.list() }));
      } catch (e) { return send(res, 400, v.staffPage({ error: e.message, recent: store.list() })); }
    }
  }
  send(res, 404, v.lookupPage('Page not found.'));
}

const server = http.createServer((req, res) => handle(req, res).catch((e) => { console.error(e); if (!res.headersSent) send(res, 500, '<p>Something went wrong.</p>'); }));
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`QR coupon app: ${BASE_URL}\n  QR poster:  ${BASE_URL}/poster\n  Staff:      ${BASE_URL}/staff  (PIN: ${process.env.STAFF_PIN ? 'from STAFF_PIN' : STAFF_PIN + ' — set STAFF_PIN to choose your own'})`);
  });
}
module.exports = { server, store };
