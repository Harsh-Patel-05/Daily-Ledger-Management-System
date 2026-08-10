import { useCallback, useEffect, useState } from 'react';

function readStore(key, seed) {
  if (!key) return Array.isArray(seed) ? [...seed] : [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return Array.isArray(seed) ? [...seed] : [];
}

function writeStore(key, items) {
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(items));
}

/**
 * Optional localStorage CRUD helper. Pass storageKey=null to disable persistence.
 */
export function useLocalCollection(storageKey, seed = []) {
  const [items, setItems] = useState(() => readStore(storageKey, seed));

  useEffect(() => {
    if (!storageKey) return;
    writeStore(storageKey, items);
  }, [storageKey, items]);

  const add = useCallback((payload) => {
    const row = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...payload,
    };
    setItems((prev) => [row, ...prev]);
    return row;
  }, []);

  const update = useCallback((id, patch) => {
    setItems((prev) =>
      prev.map((row) => (String(row.id) === String(id) ? { ...row, ...patch, updatedAt: new Date().toISOString() } : row))
    );
  }, []);

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((row) => String(row.id) !== String(id)));
  }, []);

  const reset = useCallback(() => {
    setItems(Array.isArray(seed) ? [...seed] : []);
  }, [seed]);

  return { items, setItems, add, update, remove, reset };
}
