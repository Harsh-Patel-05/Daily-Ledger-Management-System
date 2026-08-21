/** Prefer backend toast `apiMessage` / `message` / `detail`. */

export function getApiMessage(payload, fallback = '') {
  if (payload == null) return fallback;
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (typeof payload !== 'object') return fallback;
  if (typeof payload.apiMessage === 'string' && payload.apiMessage.trim()) return payload.apiMessage;
  if (typeof payload.message === 'string' && payload.message.trim()) return payload.message;
  if (typeof payload.detail === 'string' && payload.detail.trim()) return payload.detail;
  if (Array.isArray(payload.detail) && payload.detail.length) {
    const first = payload.detail[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && first.string) return String(first.string);
  }
  return fallback;
}

export function getApiErrorMessage(err, fallback = 'Request failed') {
  if (!err) return fallback;
  if (typeof err === 'string' && err.trim()) return err;
  const fromData = getApiMessage(err.data, '');
  if (fromData) return fromData;
  if (err.message && String(err.message).trim()) return err.message;
  return fallback;
}
