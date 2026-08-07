/**
 * Forever-free reminder channels (no paid SMS/WhatsApp/Email APIs).
 * Opens the user's WhatsApp / Messages / Mail app with a pre-filled message.
 */

export function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

/** Normalize to India WhatsApp format: 91XXXXXXXXXX */
export function toWhatsAppNumber(mobile) {
  let d = digitsOnly(mobile);
  if (!d) return '';
  if (d.startsWith('91') && d.length >= 12) return d.slice(0, 12);
  if (d.length === 10) return `91${d}`;
  if (d.startsWith('0') && d.length === 11) return `91${d.slice(1)}`;
  if (d.length > 10 && d.startsWith('91')) return d;
  return d;
}

export function toE164India(mobile) {
  const wa = toWhatsAppNumber(mobile);
  return wa ? `+${wa}` : '';
}

export function isValidIndianMobile(mobile) {
  const d = digitsOnly(mobile);
  if (d.length === 10) return /^[6-9]\d{9}$/.test(d);
  if (d.length === 12 && d.startsWith('91')) return /^91[6-9]\d{9}$/.test(d);
  if (d.length === 11 && d.startsWith('0')) return /^0[6-9]\d{9}$/.test(d);
  return false;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export function buildWhatsAppUrl(mobile, text) {
  const phone = toWhatsAppNumber(mobile);
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text || '')}`;
}

export function buildSmsUrl(mobile, text) {
  const e164 = toE164India(mobile);
  if (!e164) return null;
  const body = encodeURIComponent(text || '');
  // iOS wants &body=, Android prefers ?body=
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/i.test(navigator.userAgent);
  return isIOS ? `sms:${e164}&body=${body}` : `sms:${e164}?body=${body}`;
}

export function buildMailtoUrl(email, { subject = '', body = '' } = {}) {
  const to = String(email || '').trim();
  if (!to) return null;
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  const qs = params.toString().replace(/\+/g, '%20');
  return qs ? `mailto:${to}?${qs}` : `mailto:${to}`;
}

export function buildDefaultReminderMessage({ customer, profile, formatCurrency, formatPhone }) {
  const shop = profile?.shopName || 'Your shop';
  const bal = formatCurrency?.(customer?.currentBalance) ?? `₹${customer?.currentBalance ?? 0}`;
  const phone = formatPhone?.(profile?.mobile) || profile?.mobile || '';
  return (
    `Namaste ${customer?.name || 'ji'} ji,\n\n` +
    `${shop} se reminder: aapka outstanding balance ${bal} hai. ` +
    `Kripya jald se jald payment kar dein.\n\n` +
    `Dhanyavaad,\n${shop}` +
    (phone ? `\n${phone}` : '')
  );
}

/**
 * Open free channel. Returns { ok, method, error }.
 * whatsapp → wa.me (free)
 * sms → native SMS app (free)
 * email → mailto (free)
 * inapp → no external open
 */
export function openFreeChannel(channel, { mobile, email, text, subject }) {
  if (channel === 'inapp') {
    return { ok: true, method: 'inapp' };
  }

  let url = null;
  if (channel === 'whatsapp') {
    if (!isValidIndianMobile(mobile)) {
      return { ok: false, error: 'Valid 10-digit mobile required for WhatsApp' };
    }
    url = buildWhatsAppUrl(mobile, text);
  } else if (channel === 'sms') {
    if (!isValidIndianMobile(mobile)) {
      return { ok: false, error: 'Valid 10-digit mobile required for SMS' };
    }
    url = buildSmsUrl(mobile, text);
  } else if (channel === 'email') {
    if (!isValidEmail(email)) {
      return { ok: false, error: 'Customer email is missing or invalid' };
    }
    url = buildMailtoUrl(email, { subject, body: text });
  } else {
    return { ok: false, error: 'Unknown channel' };
  }

  if (!url) return { ok: false, error: 'Could not build link' };

  try {
    if (channel === 'whatsapp') {
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        // popup blocked — same-tab fallback
        window.location.assign(url);
      }
    } else {
      // mailto: / sms: work best via location (avoids blank tab)
      window.location.href = url;
    }
    return { ok: true, method: channel, url };
  } catch {
    return { ok: false, error: 'Could not open app. Copy the message instead.', url };
  }
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

export function channelAvailability(customer) {
  return {
    whatsapp: isValidIndianMobile(customer?.mobile),
    sms: isValidIndianMobile(customer?.mobile),
    email: isValidEmail(customer?.email),
    inapp: true,
  };
}
