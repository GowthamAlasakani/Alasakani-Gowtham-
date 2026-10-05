const test = require('node:test');
const assert = require('node:assert');
const os = require('os'); const path = require('path'); const fs = require('fs');
const { Store } = require('../lib/store');
const mk = () => new Store(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'qc-')), 'c.json'));

test('registers once per phone', () => {
  const s = mk();
  const a = s.register({ name: 'A', phone: '(555) 123-4567' });
  const b = s.register({ name: 'A', phone: '1-555-123-4567' });
  assert.ok(b.existing); assert.strictEqual(a.coupon.code, b.coupon.code);
});
test('rejects bad input', () => {
  const s = mk();
  assert.throws(() => s.register({ name: '', phone: '5551234567' }));
  assert.throws(() => s.register({ name: 'A', phone: '123' }));
});
test('redeem enforces $30 minimum, 10%, single use', () => {
  const s = mk(); const { coupon } = s.register({ name: 'A', phone: '5551234567' });
  assert.throws(() => s.redeem(coupon.code, 29.99, 'in-store'), /at least \$30/);
  const c = s.redeem(coupon.code.toLowerCase(), 45, 'phone');
  assert.strictEqual(c.discount, 4.5);
  assert.throws(() => s.redeem(coupon.code, 50, 'in-store'), /already used/);
});
test('expired coupon cannot be redeemed', () => {
  const s = mk(); const { coupon } = s.register({ name: 'A', phone: '5551234567' }, new Date('2020-01-01'));
  assert.throws(() => s.redeem(coupon.code, 50, 'in-store'), /expired/);
});
