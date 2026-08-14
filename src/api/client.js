// Relative `/api` works with Vite proxy + ngrok (avoids HTTPS→HTTP mixed content).
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const TOKEN_KEY = 'dlms_tokens';
const USER_KEY = 'dlms_auth';

export function getApiBase() {
  return API_BASE;
}

/** Turn absolute backend URLs (pagination `next`) into same-origin paths. */
function toApiPath(urlOrPath) {
  if (!urlOrPath) return urlOrPath;
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    try {
      const u = new URL(urlOrPath);
      return `${u.pathname}${u.search}`;
    } catch {
      return urlOrPath;
    }
  }
  return urlOrPath;
}

export function getTokens() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setTokens(tokens) {
  if (!tokens) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (!user) localStorage.removeItem(USER_KEY);
  else localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function pickErrorMessage(data, status) {
  if (!data) return `Request failed (${status})`;
  if (typeof data === 'string') return data;
  if (data.detail) return typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
  const first = Object.entries(data).find(([, v]) => v != null);
  if (first) {
    const [k, v] = first;
    const msg = Array.isArray(v) ? v[0] : v;
    return typeof msg === 'string' ? `${k}: ${msg}` : JSON.stringify(data);
  }
  return `Request failed (${status})`;
}

const MAX_PARALLEL = 3;
let inflight = 0;
const waiters = [];

function acquireSlot() {
  return new Promise((resolve) => {
    const tryStart = () => {
      if (inflight < MAX_PARALLEL) {
        inflight += 1;
        resolve();
        return;
      }
      waiters.push(tryStart);
    };
    tryStart();
  });
}

function releaseSlot() {
  inflight = Math.max(0, inflight - 1);
  const next = waiters.shift();
  if (next) next();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function queuedFetch(url, init) {
  await acquireSlot();
  try {
    return await fetch(url, init);
  } finally {
    releaseSlot();
  }
}

let refreshPromise = null;

async function refreshAccessToken() {
  const tokens = getTokens();
  if (!tokens?.refresh) throw new ApiError('Session expired', 401);

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await fetch(`${API_BASE}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh: tokens.refresh }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        clearAuthStorage();
        throw new ApiError('Session expired', 401, data);
      }
      const next = { ...tokens, access: data.access, refresh: data.refresh || tokens.refresh };
      setTokens(next);
      return next.access;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** Resolve request path against API_BASE without doubling `/api`. */
function resolveUrl(path) {
  const cleaned = toApiPath(path);
  if (!cleaned) return API_BASE;
  if (cleaned.startsWith(API_BASE + '/') || cleaned === API_BASE) return cleaned;
  if (cleaned.startsWith('/api/') || cleaned === '/api') return cleaned;
  return `${API_BASE}${cleaned.startsWith('/') ? cleaned : `/${cleaned}`}`;
}

async function request(path, options = {}, retry = true, attempt = 0) {
  const {
    method = 'GET',
    body,
    auth = true,
    headers: extraHeaders = {},
    formData = false,
  } = options;

  const headers = { Accept: 'application/json', ...extraHeaders };
  if (!formData && body != null && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const tokens = getTokens();
    if (tokens?.access) headers.Authorization = `Bearer ${tokens.access}`;
  }

  const url = resolveUrl(path);
  const init = {
    method,
    headers,
    body: body == null || formData || body instanceof FormData
      ? body
      : typeof body === 'string'
        ? body
        : JSON.stringify(body),
  };

  let res;
  try {
    res = await queuedFetch(url, init);
  } catch {
    if (attempt < 3 && method === 'GET') {
      await sleep(400 * (attempt + 1));
      return request(path, options, retry, attempt + 1);
    }
    throw new ApiError('Cannot reach API. Check that the backend is running.', 0);
  }

  if ([502, 503, 504].includes(res.status) && attempt < 3 && method === 'GET') {
    await sleep(400 * (attempt + 1));
    return request(path, options, retry, attempt + 1);
  }

  if (res.status === 401 && auth && retry) {
    try {
      await refreshAccessToken();
      return request(path, options, false, 0);
    } catch {
      clearAuthStorage();
      throw new ApiError('Session expired. Please login again.', 401);
    }
  }

  if (res.status === 204) return null;

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(pickErrorMessage(data, res.status), res.status, data);
  }
  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  upload: (path, formData, opts) =>
    request(path, { ...opts, method: opts?.method || 'PATCH', body: formData, formData: true }),
};

/** Paginated list → all results (up to page_size=100 per page). */
export async function fetchAll(path) {
  const sep = path.includes('?') ? '&' : '?';
  let nextPath = `${path}${sep}page_size=100`;
  const all = [];
  while (nextPath) {
    const data = await api.get(nextPath);
    if (Array.isArray(data)) return data;
    all.push(...(data.results || []));
    if (!data.next) break;
    nextPath = toApiPath(data.next);
  }
  return all;
}

export { ApiError };
