export const GAMES = {
  730: "Counter-Strike 2",
  570: "Dota 2",
  440: "Team Fortress 2",
  252490: "Rust",
};
export function cents(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1000000)
    throw Error("Enter a price between €0 and €1,000,000.");
  return Math.round(n * 100);
}
export function buyerCost(net) {
  return (
    net +
    Math.max(1, Math.floor((net * 5) / 100)) +
    Math.max(1, Math.floor((net * 10) / 100))
  );
}
export function netEstimate(gross) {
  if (!Number.isSafeInteger(gross) || gross < 0) throw Error("Invalid price.");
  if (gross < 3) return 0;
  let lo = 0,
    hi = gross;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (buyerCost(mid) <= gross) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
export function marketURL(appid, name) {
  return `https://steamcommunity.com/market/listings/${appid}/${encodeURIComponent(name)}`;
}
export function parseEuro(text) {
  if (typeof text !== "string" || !text.includes("€")) return null;
  const cleaned = text
    .replace(/[^\d,.]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const value = Number(cleaned);
  return cleaned && Number.isFinite(value) ? Math.round(value * 100) : null;
}
export function validateItem(raw) {
  if (!raw || !GAMES[raw.appid]) throw Error("Choose a supported game.");
  const name = String(raw.name || "").trim();
  if (!name || name.length > 180 || /[\x00-\x1f]/.test(name))
    throw Error("Use the exact Steam market name (up to 180 characters).");
  const quantity = Number(raw.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100000)
    throw Error("Quantity must be between 1 and 100,000.");
  for (const key of ["cost", "target"])
    if (
      raw[key] !== null &&
      (!Number.isSafeInteger(raw[key]) || raw[key] < 0 || raw[key] > 100000000)
    )
      throw Error("Invalid price.");
  return {
    appid: Number(raw.appid),
    name,
    quantity,
    cost: raw.cost,
    target: raw.target,
    notes: String(raw.notes || "").slice(0, 2000),
  };
}
export function validateBackup(data) {
  if (
    data?.version !== 1 ||
    !Array.isArray(data.items) ||
    data.items.length > 12
  )
    throw Error("Use a Steam Shelf backup with at most 12 items.");
  const keys = new Set();
  return data.items.map((raw) => {
    const item = validateItem(raw),
      id = `${item.appid}:${item.name}`;
    if (keys.has(id)) throw Error("The backup contains duplicate items.");
    keys.add(id);
    const history = Array.isArray(raw.history)
      ? raw.history
          .slice(-60)
          .filter(
            (s) =>
              Number.isSafeInteger(s.price) &&
              s.price >= 0 &&
              s.price <= 100000000 &&
              typeof s.at === "string" &&
              Number.isFinite(Date.parse(s.at)),
          )
      : [];
    return { ...item, id, history };
  });
}
