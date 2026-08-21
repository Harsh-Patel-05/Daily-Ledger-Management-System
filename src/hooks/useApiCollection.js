import { useCallback, useEffect, useRef, useState } from 'react';
import { booksCreate, booksDelete, booksList, booksUpdate } from '../api/books';
import { getActiveCompanyId } from '../api/client';

/**
 * API-backed collection for books masters / vouchers (same add/update/remove shape as CrudListPage).
 * Reloads when active company changes (X-Company-Id).
 */
export function useApiCollection(resource, { query = '', mapRow, toPayload, enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled && resource));
  const [error, setError] = useState(null);
  const [companyId, setCompanyId] = useState(() => getActiveCompanyId());
  const mapRowRef = useRef(mapRow);
  const toPayloadRef = useRef(toPayload);
  mapRowRef.current = mapRow;
  toPayloadRef.current = toPayload;

  useEffect(() => {
    const sync = () => setCompanyId(getActiveCompanyId());
    window.addEventListener('storage', sync);
    window.addEventListener('dlms-company-changed', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('dlms-company-changed', sync);
    };
  }, []);

  const reload = useCallback(async () => {
    if (!enabled || !resource) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await booksList(resource, query);
      const mapFn = mapRowRef.current;
      setItems((mapFn ? rows.map(mapFn) : rows) || []);
    } catch (err) {
      setError(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [resource, query, enabled, companyId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const add = useCallback(
    async (payload) => {
      const body = toPayloadRef.current ? toPayloadRef.current(payload) : payload;
      const row = await booksCreate(resource, body);
      const mapped = mapRowRef.current ? mapRowRef.current(row) : row;
      setItems((prev) => [mapped, ...prev]);
      return mapped;
    },
    [resource]
  );

  const update = useCallback(
    async (id, patch) => {
      const body = toPayloadRef.current ? toPayloadRef.current(patch) : patch;
      const row = await booksUpdate(resource, id, body);
      const mapped = mapRowRef.current ? mapRowRef.current(row) : row;
      setItems((prev) => prev.map((r) => (String(r.id) === String(id) ? { ...r, ...mapped } : r)));
      return mapped;
    },
    [resource]
  );

  const remove = useCallback(
    async (id) => {
      const row = await booksDelete(resource, id);
      setItems((prev) => prev.filter((r) => String(r.id) !== String(id)));
      return row;
    },
    [resource]
  );

  return { items, setItems, add, update, remove, reload, loading, error };
}
