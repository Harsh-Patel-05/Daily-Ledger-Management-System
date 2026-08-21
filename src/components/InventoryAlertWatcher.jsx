import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { notifyOwner } from '../utils/browserNotify';

/**
 * Surfaces low / out-of-stock alerts when settings.lowStockAlert is enabled.
 */
export default function InventoryAlertWatcher() {
  const { isAuthenticated } = useAuth();
  const { settings } = useApp();
  const { stats, ready } = useInventory();
  const toast = useToast();
  const primedRef = useRef(false);
  const knownRef = useRef(new Set());
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    if (!isAuthenticated || !ready || !settings?.lowStockAlert) {
      primedRef.current = false;
      knownRef.current = new Set();
      return;
    }

    const alertIds = new Set([
      ...(stats.lowStockItems || []).map((p) => `low:${p.id}`),
      ...(stats.outOfStockItems || []).map((p) => `out:${p.id}`),
    ]);

    if (!primedRef.current) {
      knownRef.current = alertIds;
      primedRef.current = true;
      return;
    }

    const fresh = [...alertIds].filter((id) => !knownRef.current.has(id));
    knownRef.current = alertIds;
    if (!fresh.length) return;

    const outCount = fresh.filter((id) => id.startsWith('out:')).length;
    const lowCount = fresh.filter((id) => id.startsWith('low:')).length;
    const title = outCount
      ? `${outCount} product${outCount > 1 ? 's' : ''} out of stock`
      : `${lowCount} product${lowCount > 1 ? 's' : ''} low on stock`;
    const message = outCount
      ? 'Inventory needs restocking for out-of-stock items.'
      : 'Some products are at or below reorder level.';

    notifyOwner({ title, message, id: `inv-${Date.now()}` }, { toast: toastRef.current });
  }, [
    isAuthenticated,
    ready,
    settings?.lowStockAlert,
    stats.lowStockItems,
    stats.outOfStockItems,
  ]);

  return null;
}
