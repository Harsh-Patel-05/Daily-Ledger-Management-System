import { api, fetchAll } from './client';

function normalizeNotification(n) {
  return {
    ...n,
    read: n.read ?? n.isRead ?? false,
  };
}

export async function listNotifications() {
  const rows = await fetchAll('/notifications/');
  return rows.map(normalizeNotification);
}

export async function markNotificationRead(id) {
  const n = await api.post(`/notifications/${id}/read/`);
  return normalizeNotification(n);
}

export async function markAllNotificationsRead() {
  return api.post('/notifications/mark-all-read/');
}

export async function listActivity() {
  const rows = await api.get('/notifications/activity/');
  return (rows || []).map((a) => ({
    id: a.id,
    type: a.type,
    message: a.message,
    at: a.createdAt || a.created_at,
  }));
}
