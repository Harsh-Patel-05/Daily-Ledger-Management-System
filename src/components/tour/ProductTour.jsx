import { useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaBookOpen,
  FaCheckCircle,
  FaArrowRight,
} from 'react-icons/fa';
import { useTour } from '../../context/TourContext';
import { useApp } from '../../context/AppContext';
import Button from '../ui/Button';

const PAD = 8;

function getTargetRect(targetId) {
  if (!targetId) return null;
  const nodes = document.querySelectorAll(`[data-tour="${targetId}"]`);
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    return {
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
      bottom: r.bottom + PAD,
      right: r.right + PAD,
    };
  }
  return null;
}

function tooltipStyle(rect, placement, cardW = 360, cardH = 220) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 16;

  if (!rect || placement === 'center') {
    return null; // handled by hero card layout
  }

  let top = rect.bottom + 12;
  let left = rect.left;

  if (placement === 'right') {
    top = rect.top;
    left = rect.right + 12;
  } else if (placement === 'left') {
    top = rect.top;
    left = rect.left - cardW - 12;
  } else if (placement === 'top') {
    top = rect.top - cardH - 12;
    left = rect.left;
  }

  left = Math.max(margin, Math.min(left, vw - cardW - margin));
  top = Math.max(margin, Math.min(top, vh - cardH - margin));

  return {
    position: 'fixed',
    top,
    left,
    width: Math.min(cardW, vw - 32),
    transform: 'none',
  };
}

function ProgressDots({ total, stepIndex }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === stepIndex
              ? 'w-7 bg-primary'
              : i < stepIndex
                ? 'w-2.5 bg-primary/45'
                : 'w-2.5 bg-slate-200 dark:bg-slate-600'
          }`}
        />
      ))}
    </div>
  );
}

function CenterTourCard({ step, stepIndex, total, isFirst, isLast, next, prev, skip }) {
  const isFinish = step.id === 'finish';

  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ type: 'spring', damping: 24, stiffness: 280 }}
      className="relative z-10 w-full max-w-[440px] mx-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="overflow-hidden rounded-3xl border border-border bg-surface soft-shadow">
        {/* Hero band */}
        <div className="relative px-6 pt-7 pb-5 bg-gradient-to-br from-primary via-primary to-primary-dark text-white">
          <div className="absolute -top-10 -right-8 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-8 w-24 h-24 rounded-full bg-white/5 blur-xl pointer-events-none" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0 ring-1 ring-white/20">
                {isFinish ? <FaCheckCircle size={22} /> : <FaBookOpen size={20} />}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                  {isFinish ? 'Tour complete' : `Step ${stepIndex + 1} of ${total}`}
                </p>
                <h2 className="text-xl font-bold leading-tight mt-0.5">{step.title}</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={skip}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Skip tour"
            >
              <FaTimes size={13} />
            </button>
          </div>

          {step.headline && (
            <p className="relative mt-4 text-sm text-white/85 font-medium">{step.headline}</p>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {step.body}
          </p>

          {Array.isArray(step.highlights) && step.highlights.length > 0 && (
            <ul className="mt-4 space-y-2.5">
              {step.highlights.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200"
                >
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FaCheckCircle size={11} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 mb-5">
            <ProgressDots total={total} stepIndex={stepIndex} />
          </div>

          <div className="flex items-center justify-between gap-3">
            {!isFinish ? (
              <button
                type="button"
                onClick={skip}
                className="text-sm font-medium text-muted hover:text-slate-700 dark:hover:text-slate-200 px-1"
              >
                Skip for now
              </button>
            ) : (
              <span className="text-xs text-muted">Replay anytime from Settings or ?</span>
            )}

            <div className="flex gap-2">
              {!isFirst && !isFinish && (
                <Button variant="outline" size="sm" onClick={prev}>
                  <FaChevronLeft size={10} /> Back
                </Button>
              )}
              <Button size="sm" onClick={next} className="min-w-[7.5rem]">
                {isFinish ? (
                  <>Got it</>
                ) : isFirst ? (
                  <>
                    Start tour <FaArrowRight size={11} />
                  </>
                ) : (
                  <>
                    Next <FaArrowRight size={11} />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SpotlightTourCard({
  step, stepIndex, total, isFirst, isLast, next, prev, skip, style,
}) {
  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22 }}
      className="z-10 bg-surface rounded-2xl soft-shadow border border-border p-5"
      style={{ ...style, zIndex: 1 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Step {stepIndex + 1} of {total}
          </p>
          <h3 className="text-base font-bold text-slate-800 dark:text-white leading-tight mt-0.5">
            {step.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={skip}
          className="p-1.5 rounded-lg text-muted hover:bg-slate-100 dark:hover:bg-slate-700"
          title="Skip tour"
        >
          <FaTimes size={12} />
        </button>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
        {step.body}
      </p>

      <div className="mb-4">
        <ProgressDots total={total} stepIndex={stepIndex} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={skip}
          className="text-xs font-medium text-muted hover:text-slate-700 dark:hover:text-slate-200 px-1"
        >
          Skip tour
        </button>
        <div className="flex gap-2">
          {!isFirst && (
            <Button variant="outline" size="sm" onClick={prev}>
              <FaChevronLeft size={10} /> Back
            </Button>
          )}
          <Button size="sm" onClick={next}>
            {isLast ? 'Finish' : 'Next'}
            {!isLast && <FaChevronRight size={10} />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function ProductTour() {
  const { active, step, stepIndex, total, next, prev, skip } = useTour();
  const { setSidebarOpen, sidebarCollapsed, setSidebarCollapsed } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [rect, setRect] = useState(null);
  const [tick, setTick] = useState(0);

  const measure = useCallback(() => {
    if (!step?.target) {
      setRect(null);
      return;
    }
    const nodes = document.querySelectorAll(`[data-tour="${step.target}"]`);
    for (const el of nodes) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
        break;
      }
    }
    setRect(getTargetRect(step.target));
  }, [step]);

  useEffect(() => {
    if (!active || !step?.openSection) return;
    window.dispatchEvent(
      new CustomEvent('dlms-tour-expand', { detail: { sectionId: step.openSection } })
    );
  }, [active, step?.id, step?.openSection]);

  // Ensure sidebar targets are visible during tour
  useEffect(() => {
    if (!active || !step) return;
    const needsSidebar =
      step.target === 'sidebar'
      || (step.target && String(step.target).startsWith('nav-'));
    if (!needsSidebar) return;
    setSidebarOpen(true);
    if (sidebarCollapsed) setSidebarCollapsed(false);
  }, [active, step?.id, step?.target, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed]);

  useEffect(() => {
    if (!active || !step?.route) return;
    const route = step.route;
    const matched =
      location.pathname === route
      || (route !== '/dashboard' && location.pathname.startsWith(route));
    if (!matched) {
      navigate(route);
    }
  }, [active, step?.route, step?.id, navigate, location.pathname]);

  useLayoutEffect(() => {
    if (!active) return;
    const t = setTimeout(measure, step?.openSection ? 260 : 100);
    return () => clearTimeout(t);
  }, [active, step, location.pathname, measure, tick]);

  useEffect(() => {
    if (!active) return undefined;
    const onResize = () => setTick((n) => n + 1);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [active]);

  useEffect(() => {
    if (!active || !step?.target) return undefined;
    if (rect) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 200);
    const stop = setTimeout(() => clearInterval(id), 2000);
    return () => {
      clearInterval(id);
      clearTimeout(stop);
    };
  }, [active, step, rect]);

  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') skip();
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        next();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, next, prev, skip]);

  const isLast = stepIndex >= total - 1;
  const isFirst = stepIndex === 0;
  const isCenter = step?.placement === 'center';
  const style = tooltipStyle(rect, step?.placement || 'center');

  return (
    <AnimatePresence>
      {active && step && (
        <div className="fixed inset-0 z-[300] no-print" aria-modal="true" role="dialog">
          {isCenter ? (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
                onClick={skip}
              />
              <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
                <div className="pointer-events-auto w-full flex justify-center">
                  <CenterTourCard
                    step={step}
                    stepIndex={stepIndex}
                    total={total}
                    isFirst={isFirst}
                    isLast={isLast}
                    next={next}
                    prev={prev}
                    skip={skip}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {rect ? (
                <div
                  className="absolute rounded-xl pointer-events-none transition-all duration-300"
                  style={{
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.58)',
                    outline: '2px solid var(--color-primary)',
                    outlineOffset: 2,
                  }}
                />
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900/55 backdrop-blur-[1px]"
                  onClick={skip}
                />
              )}

              {rect && (
                <button
                  type="button"
                  className="absolute inset-0 cursor-default"
                  aria-label="Dismiss tour overlay"
                  onClick={skip}
                  style={{ zIndex: 0 }}
                />
              )}

              <SpotlightTourCard
                step={step}
                stepIndex={stepIndex}
                total={total}
                isFirst={isFirst}
                isLast={isLast}
                next={next}
                prev={prev}
                skip={skip}
                style={style || {
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: Math.min(360, window.innerWidth - 32),
                }}
              />
            </>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
