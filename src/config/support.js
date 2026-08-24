/** Support / desktop links — override via Vite env. */

const DEFAULT_WHATSAPP = '919687401551';
const DEFAULT_EMAIL = 'support@dailyledger.app';

export function getSupportWhatsApp() {
  const raw = (import.meta.env.VITE_SUPPORT_WHATSAPP || DEFAULT_WHATSAPP).replace(/\D/g, '');
  return raw || DEFAULT_WHATSAPP;
}

export function getSupportEmail() {
  return (import.meta.env.VITE_SUPPORT_EMAIL || DEFAULT_EMAIL).trim() || DEFAULT_EMAIL;
}

/** Optional real installer (.exe / .dmg / store). If empty, PWA install is used. */
export function getDesktopAppUrl() {
  return (import.meta.env.VITE_DESKTOP_APP_URL || '').trim();
}

export function whatsappSupportUrl(message = '') {
  const phone = getSupportWhatsApp();
  const text = encodeURIComponent(message || 'Hi, I need help with Daily Ledger.');
  return `https://wa.me/${phone}?text=${text}`;
}

export function emailSupportUrl({ subject = 'Daily Ledger Support', body = '' } = {}) {
  const to = getSupportEmail();
  const qs = new URLSearchParams();
  if (subject) qs.set('subject', subject);
  if (body) qs.set('body', body);
  const q = qs.toString();
  return q ? `mailto:${to}?${q}` : `mailto:${to}`;
}
