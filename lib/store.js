const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DISCOUNT_PERCENT = 10;
const MIN_PURCHASE = 30;
const VALID_DAYS = 30;

// No 0/O/1/I so codes are easy to read out over the phone.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode() {
  let s = '';
  const bytes = crypto.randomBytes(6);
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return `SAVE-${s}`;
}

function normalizePhone(p) {
  const digits = String(p || '').replace(/\D/g, '');
  return digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits;
}

function normalizeCode(c) {
  return String(c || '').toUpperCase().replace(/\s+/g, '').replace(/^SAVE-?/, 'SAVE-');
}

class Store {
  constructor(file) {
    this.file = file;
    this.data = { coupons: [] };
    if (fs.existsSync(file)) this.data = JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  status(c, now = new Date()) {
    if (c.redeemedAt) return 'redeemed';
    if (new Date(c.expiresAt) < now) return 'expired';
    return 'active';
  }

  // One coupon per phone number; re-registering returns the existing one.
  register({ name, phone, email }, now = new Date()) {
    name = String(name || '').trim();
    const p = normalizePhone(phone);
    if (!name) throw new Error('Please enter your name.');
    if (p.length !== 10) throw new Error('Please enter a valid 10-digit phone number.');
    const existing = this.data.coupons.find((c) => c.phone === p);
    if (existing) return { coupon: existing, existing: true };
    const coupon = {
      code: makeCode(),
      name,
      phone: p,
      email: String(email || '').trim(),
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + VALID_DAYS * 864e5).toISOString(),
      redeemedAt: null,
      channel: null,
      purchaseAmount: null,
      discount: null,
    };
    this.data.coupons.push(coupon);
    this.save();
    return { coupon, existing: false };
  }

  find(code) {
    const n = normalizeCode(code);
    return this.data.coupons.find((c) => c.code === n);
  }

  findByPhone(phone) {
    const p = normalizePhone(phone);
    return this.data.coupons.find((c) => c.phone === p);
  }

  redeem(code, amount, channel, now = new Date()) {
    const c = this.find(code);
    if (!c) throw new Error('Coupon not found.');
    const st = this.status(c, now);
    if (st === 'redeemed') throw new Error('Coupon was already used.');
    if (st === 'expired') throw new Error('Coupon has expired.');
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) throw new Error('Enter the purchase amount.');
    if (amt < MIN_PURCHASE) throw new Error(`Purchase must be at least $${MIN_PURCHASE}.`);
    if (!['in-store', 'phone'].includes(channel)) throw new Error('Choose in-store or phone.');
    c.redeemedAt = now.toISOString();
    c.channel = channel;
    c.purchaseAmount = amt;
    c.discount = Math.round(amt * DISCOUNT_PERCENT) / 100;
    this.save();
    return c;
  }

  list() {
    return [...this.data.coupons].reverse();
  }
}

module.exports = { Store, DISCOUNT_PERCENT, MIN_PURCHASE, VALID_DAYS, normalizePhone };
