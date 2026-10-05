const { DISCOUNT_PERCENT, MIN_PURCHASE, VALID_DAYS } = require('./store');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const { brand } = require('./brand');
const BIZ = brand.name;
const BIZ_PHONE = brand.phone;

const header = () => `<header class="center">${brand.logoUrl ? `<img src="${brand.logoUrl}" alt="${esc(brand.name)} logo" style="max-height:90px;max-width:80%">` : ''}
<h1>${esc(brand.name)}</h1><div class="muted">${esc(brand.tagline)}</div></header>`;
const footer = () => `<footer class="center muted" style="margin-top:24px;font-size:.9rem">
<div><a href="${brand.mapUrl}">${esc(brand.address)}</a></div>
<div><a href="${brand.tel}">${esc(brand.phone)}</a> · ${brand.website ? ` · <a href="${esc(brand.website)}">${esc(brand.website.replace(/^https?:\/\//, ''))}</a>` : ''}</div>
${brand.hours ? `<div>${esc(brand.hours)}</div>` : ''}</footer>`;

const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>
:root{--bg:#f6f7fb;--card:#fff;--ink:#1c2230;--muted:#667;--brand:#c23c0e;--btn:#fff;--ok:#14803c;--bad:#b42318;--line:#e3e6ee}
@media(prefers-color-scheme:dark){:root{--bg:#12151c;--card:#1c2130;--ink:#eef0f6;--muted:#9aa3b5;--brand:#f25426;--btn:#1c1006;--ok:#4cc27a;--bad:#f0776b;--line:#2c3346}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}
main{max-width:460px;margin:0 auto;padding:20px 16px 40px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;margin-top:16px}
h1{font-size:1.5rem;margin:.2em 0}h2{font-size:1.1rem;margin:0 0 .5em}.muted{color:var(--muted)}
label{display:block;font-weight:600;margin:12px 0 4px}
input,select{width:100%;padding:12px;font-size:1rem;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink)}
button{width:100%;margin-top:16px;padding:14px;font-size:1rem;font-weight:700;border:0;border-radius:10px;background:var(--brand);color:var(--btn);cursor:pointer}
.err{color:var(--bad);font-weight:600}.ok{color:var(--ok);font-weight:600}
.code{font:700 1.8rem ui-monospace,monospace;letter-spacing:.06em;text-align:center;padding:14px;border:2px dashed var(--brand);border-radius:12px;margin:12px 0}
.center{text-align:center}table{width:100%;border-collapse:collapse;font-size:.85rem}td,th{padding:6px 4px;border-bottom:1px solid var(--line);text-align:left}
</style></head><body><main>${body}${footer()}</main></body></html>`;

const terms = `<p class="muted">${DISCOUNT_PERCENT}% off a single purchase of $${MIN_PURCHASE} or more, in-store or by phone order. One per customer, valid ${VALID_DAYS} days from sign-up. Not combinable with other offers.</p>`;

function registerPage(error = '', values = {}) {
  return page(`${BIZ} – Get ${DISCOUNT_PERCENT}% off`, `
${header()}
<p class="center">Register to get <b>${DISCOUNT_PERCENT}% off</b> your purchase of <b>$${MIN_PURCHASE}+</b> — in-store or by phone.</p>
<form class="card" method="post" action="/register">
${error ? `<p class="err">${esc(error)}</p>` : ''}
<label for="name">Name</label><input id="name" name="name" required autocomplete="name" value="${esc(values.name)}">
<label for="phone">Mobile phone</label><input id="phone" name="phone" type="tel" required autocomplete="tel" placeholder="(555) 123-4567" value="${esc(values.phone)}">
<label for="email">Email <span class="muted">(optional)</span></label><input id="email" name="email" type="email" autocomplete="email" value="${esc(values.email)}">
<button type="submit">Get my ${DISCOUNT_PERCENT}% coupon</button></form>
<div class="card"><p>Already registered? <a href="/coupon">Look up your coupon</a></p></div>${terms}`);
}

function couponPage(c, status, existing, couponQr) {
  const exp = new Date(c.expiresAt).toLocaleDateString('en-US', { dateStyle: 'long' });
  const call = ` Call <a href="${brand.tel}"><b>${esc(BIZ_PHONE)}</b></a> and give this code.`;
  return page('Your coupon', `
<h1>${status === 'active' ? (existing ? 'Welcome back, ' : 'You’re in, ') : 'Hi, '}${esc(c.name)}!</h1>
<div class="card center">
<h2>${DISCOUNT_PERCENT}% off $${MIN_PURCHASE}+</h2>
<div class="code">${esc(c.code)}</div>
${status === 'active' ? `<p class="ok">Active · expires ${esc(exp)}</p><img src="${couponQr}" alt="Coupon QR" width="180" height="180">
<p><b>In-store:</b> show this screen at checkout.<br><b>By phone:</b>${call}</p>`
 : status === 'redeemed' ? `<p class="err">Already used (${esc(c.channel)}).</p>` : `<p class="err">Expired ${esc(exp)}.</p>`}
</div>${terms}<p class="muted center">Tip: screenshot this page to save your code.</p>`);
}

function lookupPage(error = '') {
  return page('Find my coupon', `<h1>Find my coupon</h1><form class="card" method="post" action="/coupon">
${error ? `<p class="err">${esc(error)}</p>` : ''}<label for="phone">Phone you registered with</label>
<input id="phone" name="phone" type="tel" required><button>Show coupon</button></form><p><a href="/">Back</a></p>`);
}

function staffLogin(error = '') {
  return page('Staff', `<h1>Staff sign-in</h1><form class="card" method="post" action="/staff/login">
${error ? `<p class="err">${esc(error)}</p>` : ''}<label for="pin">PIN</label>
<input id="pin" name="pin" type="password" inputmode="numeric" required autofocus><button>Sign in</button></form>`);
}

function staffPage({ message = '', error = '', found = null, status = '', recent = [] } = {}) {
  const rows = recent.slice(0, 25).map((c) => `<tr><td>${esc(c.code)}</td><td>${esc(c.name)}</td><td>${esc(c.phone)}</td><td>${c.redeemedAt ? 'used $' + c.discount.toFixed(2) + ' off' : new Date(c.expiresAt) < new Date() ? 'expired' : 'active'}</td></tr>`).join('');
  return page('Staff', `<h1>Redeem coupon</h1>
<form class="card" method="post" action="/staff/lookup">${error ? `<p class="err">${esc(error)}</p>` : ''}${message ? `<p class="ok">${esc(message)}</p>` : ''}
<label for="q">Coupon code or customer phone</label><input id="q" name="q" required autofocus placeholder="SAVE-XXXXXX or phone"><button>Look up</button></form>
${found ? `<form class="card" method="post" action="/staff/redeem"><h2>${esc(found.name)} · ${esc(found.code)}</h2><p>Status: <b>${esc(status)}</b></p>
${status === 'active' ? `<input type="hidden" name="code" value="${esc(found.code)}">
<label for="amount">Purchase total ($, before discount)</label><input id="amount" name="amount" type="number" step="0.01" min="${MIN_PURCHASE}" required>
<label for="channel">Order type</label><select id="channel" name="channel"><option value="in-store">In-store</option><option value="phone">Phone order</option></select>
<button>Apply ${DISCOUNT_PERCENT}% &amp; mark used</button>` : ''}</form>` : ''}
<div class="card"><h2>Recent sign-ups (${recent.length} total)</h2><table><tr><th>Code</th><th>Name</th><th>Phone</th><th>Status</th></tr>${rows}</table>
<p><a href="/staff/export.csv">Download CSV</a></p></div>`);
}

function posterPage(url, svg) {
  return page('QR poster', `<div class="center">${header()}
<h2 style="font-size:1.6rem">Scan &amp; get ${DISCOUNT_PERCENT}% off</h2><div style="max-width:360px;margin:auto">${svg}</div>
<p>Register to get ${DISCOUNT_PERCENT}% off any purchase of $${MIN_PURCHASE}+<br>in-store or by phone: <b>${esc(BIZ_PHONE)}</b></p><p class="muted">${esc(url)}</p>
<p class="muted">Print this page (Ctrl/Cmd+P).</p></div>`);
}

module.exports = { registerPage, couponPage, lookupPage, staffLogin, staffPage, posterPage, esc };
