/** Normalize any id ("17" / 17 / legacy cust_17) → integer PK */
export function toPk(id) {
  if (id == null || id === '') return null;
  const s = String(id).replace(/^(cust_|txn_|inv_|notif_|prod_|cat_|sup_|mov_|unit_)/, '');
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

/** Compare ids that may be number or string (e.g. URL params). */
export function sameId(a, b) {
  const na = toPk(a);
  const nb = toPk(b);
  if (na == null || nb == null) return false;
  return na === nb;
}
