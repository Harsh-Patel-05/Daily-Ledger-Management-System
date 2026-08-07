import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { TOUR_STEPS, TOUR_STORAGE_KEY } from '../data/tourSteps';

const TourContext = createContext(null);

export function TourProvider({ children }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [readyToAutoStart, setReadyToAutoStart] = useState(false);

  const step = active ? TOUR_STEPS[stepIndex] || null : null;
  const total = TOUR_STEPS.length;

  const finish = useCallback(() => {
    setActive(false);
    setStepIndex(0);
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, '1');
    } catch {
      // ignore
    }
  }, []);

  const startTour = useCallback((fromBeginning = true) => {
    setStepIndex(fromBeginning ? 0 : 0);
    setActive(true);
  }, []);

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i >= TOUR_STEPS.length - 1) {
        // Defer finish so we don't call setState during another setState
        setTimeout(() => finish(), 0);
        return i;
      }
      return i + 1;
    });
  }, [finish]);

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  /** Call once when app data is ready for authenticated users. */
  const enableAutoStart = useCallback(() => {
    setReadyToAutoStart(true);
  }, []);

  useEffect(() => {
    if (!readyToAutoStart || active) return;
    try {
      if (localStorage.getItem(TOUR_STORAGE_KEY) === '1') return;
    } catch {
      return;
    }
    const t = setTimeout(() => startTour(true), 600);
    return () => clearTimeout(t);
  }, [readyToAutoStart, active, startTour]);

  const value = useMemo(
    () => ({
      active,
      step,
      stepIndex,
      total,
      steps: TOUR_STEPS,
      startTour,
      next,
      prev,
      skip,
      finish,
      enableAutoStart,
    }),
    [active, step, stepIndex, total, startTour, next, prev, skip, finish, enableAutoStart],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
}
