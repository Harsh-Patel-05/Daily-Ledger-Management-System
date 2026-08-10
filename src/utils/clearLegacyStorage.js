/** One-time purge of legacy frontend localStorage seeds / module caches. */
const LEGACY_KEYS = [
  'dlms_units',
  'dlms_expense_categories',
  'dlms_expenses',
  'dlms_purchase_bills',
  'dlms_purchase_payments',
  'dlms_purchase_returns',
  'dlms_sales_returns',
  'dlms_opening_balances',
  'dlms_users',
  'dlms_roles',
  'dlms_permissions',
  'dlms_unused',
  'dlms_app_data_v1',
  '__units_ui',
  '__expenses_ui',
  '__purchase_payments_ui',
  '__purchase_returns_ui',
  '__users_ui',
  '__roles_ui',
];

const FLAG = 'dlms_static_cleared_v1';

export function clearLegacyStaticStorage() {
  try {
    if (localStorage.getItem(FLAG) === '1') return;
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
    // Also sweep any leftover dlms_* demo keys except auth/theme/tour/branding
    const keep = new Set([
      'dlms_tokens',
      'dlms_auth',
      'dlms_theme_prefs',
      'dlms_theme',
      'dlms_tour_done',
      'dlms_shop_branding',
      'dlms_notif_permission_asked',
      FLAG,
    ]);
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('dlms_') && !keep.has(key)) {
        localStorage.removeItem(key);
      }
      if (key.startsWith('__') && key.endsWith('_ui')) {
        localStorage.removeItem(key);
      }
    });
    localStorage.setItem(FLAG, '1');
  } catch {
    /* ignore */
  }
}
