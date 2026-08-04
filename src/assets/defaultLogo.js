/** Default shop logo (SVG data URL) used when user hasn't uploaded one */
export const DEFAULT_LOGO =
  'data:image/svg+xml,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2563EB"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
  </defs>
  <rect width="160" height="160" rx="28" fill="url(#g)"/>
  <path d="M40 52h80v12H40zm0 22h52v12H40zm0 22h68v12H40z" fill="#fff" opacity=".95"/>
  <circle cx="118" cy="108" r="18" fill="#10B981"/>
  <path d="M110 108l5 5 12-12" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`);
