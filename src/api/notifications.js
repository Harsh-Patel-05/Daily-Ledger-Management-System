import { api, fetchAll } from './client';

function normalizeNotification(n) {
  return {
    ...n,
    read: n.read ?? n.isRead ?? false,
    customerId: n.customerId != null && n.customerId !== '' ? Number(n.customerId) : null,
  };
}

export async function listNotifications() {
  const rows = await fetchAll('/notifications/');
  return rows.map(normalizeNotification);
}

export async function syncNotifications() {
  const data = await api.post('/notifications/sync/');
  return {
    created: data.created || 0,
    unreadCount: data.unreadCount || 0,
    notifications: (data.notifications || []).map(normalizeNotification),
    ownerChannels: data.ownerChannels || null,
  };
}

export async function testOwnerAlert(force = true) {
  return api.post('/notifications/test-owner-alert/', { force: force ? 1 : 0 });
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

export async function sendReminder({ customerId, channel, message }) {
  return api.post('/notifications/send-reminder/', {
    customerId,
    channel,
    message,
  });
}
