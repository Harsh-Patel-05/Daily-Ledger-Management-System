import { api, setTokens, setStoredUser, clearAuthStorage } from './client';

function normalizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
    email: user.email,
    role: user.role || 'owner',
    shopName: user.shop_name || user.shopName || '',
    mobile: user.mobile || '',
    firstName: user.first_name,
    lastName: user.last_name,
  };
}

export async function login(email, password) {
  const data = await api.post('/auth/login/', { email, password }, { auth: false });
  setTokens({ access: data.access, refresh: data.refresh });
  const user = normalizeUser(data.user);
  setStoredUser(user);
  const msg = data.apiMessage || data.message || data.detail || 'Login successful';
  return { ...user, detail: msg, message: msg, apiMessage: msg };
}

export async function register(payload) {
  const data = await api.post('/auth/register/', payload, { auth: false });
  setTokens({ access: data.access, refresh: data.refresh });
  const user = normalizeUser(data.user);
  setStoredUser(user);
  const msg = data.apiMessage || data.message || data.detail || 'Account created successfully';
  return { ...user, detail: msg, message: msg, apiMessage: msg };
}

export async function fetchMe() {
  const data = await api.get('/auth/me/');
  const user = normalizeUser(data);
  setStoredUser(user);
  return user;
}

export function logout() {
  clearAuthStorage();
}

export async function forgotPassword(email) {
  return api.post('/auth/forgot-password/', { email }, { auth: false });
}

export async function verifyOtp(email, otp) {
  return api.post('/auth/verify-otp/', { email, otp }, { auth: false });
}

export async function resetPassword({ email, otp, password, confirm_password }) {
  return api.post(
    '/auth/reset-password/',
    { email, otp, password, confirm_password: confirm_password || password },
    { auth: false }
  );
}

export async function changePassword({ current_password, new_password, confirm_password }) {
  return api.post('/auth/change-password/', {
    current_password,
    new_password,
    confirm_password: confirm_password || new_password,
  });
}

export async function getProfile() {
  return api.get('/auth/profile/');
}

export async function updateProfile(data) {
  return api.patch('/auth/profile/', data);
}

export async function updateProfileLogo(file) {
  const fd = new FormData();
  fd.append('logo', file);
  return api.upload('/auth/profile/', fd);
}

export async function getSettings() {
  return api.get('/auth/settings/');
}

export async function updateSettings(data) {
  return api.patch('/auth/settings/', data);
}
