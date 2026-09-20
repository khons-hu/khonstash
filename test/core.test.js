import test from "node:test";
import assert from "node:assert/strict";
import {
  buyerCost,
  netEstimate,
  parseEuro,
  cents,
  validateBackup,
  marketURL,
} from "../public/core.js";
test("fee estimates use buyer-paid fees, not a flat 15% deduction", () => {
  assert.equal(netEstimate(1000), 870);
  assert.equal(buyerCost(1000), 1150);
  assert.equal(netEstimate(3), 1);
  assert.equal(netEstimate(2), 0);
});
test("fee inverse remains conservative across cent boundaries", () => {
  for (let gross = 3; gross < 10000; gross++) {
    const net = netEstimate(gross);
    assert.ok(buyerCost(net) <= gross);
    assert.ok(buyerCost(net + 1) > gross);
  }
});
test("EUR localized values parse without confusing currencies", () => {
  assert.equal(parseEuro("1.234,56€"), 123456);
  assert.equal(parseEuro("0,26€"), 26);
  assert.equal(parseEuro("$1.23"), null);
  assert.equal(parseEuro(undefined), null);
});
test("reject invalid money and untrusted backups", () => {
  assert.throws(() => cents(-1));
  assert.throws(() => cents(Infinity));
  assert.throws(() => validateBackup({ version: 2, items: [] }));
  assert.throws(() =>
    validateBackup({ version: 1, items: Array(13).fill({}) }),
  );
});
const item = {
  appid: 730,
  name: "Revolution Case",
  quantity: 2,
  cost: 26,
  target: 20,
  notes: "test",
  history: [],
};
test("backup validates fields and duplicates before replacing", () => {
  assert.equal(
    validateBackup({ version: 1, items: [item] })[0].id,
    "730:Revolution Case",
  );
  assert.throws(() => validateBackup({ version: 1, items: [item, item] }));
  assert.throws(() =>
    validateBackup({ version: 1, items: [{ ...item, quantity: 0 }] }),
  );
  assert.throws(() =>
    validateBackup({ version: 1, items: [{ ...item, appid: 123 }] }),
  );
});
test("market links encode arbitrary item names safely", () => {
  assert.equal(
    marketURL(730, "A/B #?"),
    "https://steamcommunity.com/market/listings/730/A%2FB%20%23%3F",
  );
});
