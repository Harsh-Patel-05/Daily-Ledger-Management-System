/** Normalize frontend ids (cust_17 / "17" / 17) → integer PK */
export function toPk(id) {
  if (id == null || id === '') return null;
  const s = String(id);
  const stripped = s.replace(/^(cust_|txn_|inv_|notif_)/, '');
  const n = Number(stripped);
  return Number.isNaN(n) ? stripped : n;
}
