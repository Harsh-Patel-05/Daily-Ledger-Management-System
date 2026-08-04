import { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [stack, setStack] = useState([]);

  const openModal = useCallback((type, payload = {}) => {
    setStack((prev) => [...prev, { type, payload, id: Date.now() }]);
  }, []);

  const closeModal = useCallback(() => {
    setStack((prev) => prev.slice(0, -1));
  }, []);

  const closeAll = useCallback(() => setStack([]), []);

  const current = stack[stack.length - 1] || null;

  return (
    <ModalContext.Provider value={{ openModal, closeModal, closeAll, current, stack }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}
