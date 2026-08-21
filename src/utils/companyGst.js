/** Active company GST mode helpers (Munim With GST / Unregistered). */

export function isCompanyGstEnabled(company) {
  if (!company) return true;
  if (company.hasGst === false || company.has_gst === false) return false;
  if (company.hasGst === true || company.has_gst === true) return true;
  const reg = String(company.registrationType || company.registration_type || '').toLowerCase();
  if (reg.includes('unregistered') || reg.includes('without gst') || reg.includes('non-gst')) {
    return false;
  }
  return Boolean(company.gstin);
}

/** Paths that only make sense for GST-registered companies. */
export const GST_ONLY_PATH_PREFIXES = [
  '/gst',
  '/reports/gst',
  '/settings/gst',
  '/ledger/gst-journal',
  '/inventory/hsn',
];

export function isGstOnlyPath(pathname = '') {
  const path = pathname.split(/[?#]/)[0] || '';
  return GST_ONLY_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}
