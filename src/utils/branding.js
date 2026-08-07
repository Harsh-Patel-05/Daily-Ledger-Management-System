/** Persist shop branding so navbar logo/name survive page refresh. */
const BRANDING_KEY = 'dlms_shop_branding';

export function normalizeLogoUrl(logo) {
  if (!logo || typeof logo !== 'string') return null;
  // Absolute backend URL → same-origin /media path (works with Vite proxy + refresh)
  try {
    if (logo.startsWith('http://') || logo.startsWith('https://')) {
      const u = new URL(logo);
      if (u.pathname.startsWith('/media/')) {
        return `${u.pathname}${u.search || ''}`;
      }
    }
  } catch {
    // keep as-is
  }
  return logo;
}

export function readStoredBranding() {
  try {
    const raw = localStorage.getItem(BRANDING_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      shopName: data.shopName || '',
      ownerName: data.ownerName || '',
      logo: normalizeLogoUrl(data.logo),
      email: data.email || '',
    };
  } catch {
    return null;
  }
}

export function writeStoredBranding(profile) {
  if (!profile) return;
  try {
    localStorage.setItem(
      BRANDING_KEY,
      JSON.stringify({
        shopName: profile.shopName || '',
        ownerName: profile.ownerName || '',
        logo: normalizeLogoUrl(profile.logo),
        email: profile.email || '',
      }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clearStoredBranding() {
  try {
    localStorage.removeItem(BRANDING_KEY);
  } catch {
    // ignore
  }
}

export function withNormalizedLogo(profile) {
  if (!profile) return profile;
  return {
    ...profile,
    logo: normalizeLogoUrl(profile.logo),
  };
}
