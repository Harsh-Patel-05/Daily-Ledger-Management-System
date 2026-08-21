import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCalendarAlt, FaChevronDown, FaPlus, FaSearch } from 'react-icons/fa';
import { useCompanies } from '../../context/CompaniesContext';
import { useToast } from '../../context/ToastContext';
import { getInitials, cn } from '../../utils/formatters';
import { getApiMessage, getApiErrorMessage } from '../../utils/apiMessage';

/** Munim-style subtitle: "Regular. GSTIN:…" / "Unregistered." */
function companySubtitle(company) {
  if (!company) return '';
  const reg = company.registrationType || (company.gstin ? 'Regular' : 'Unregistered');
  const shortReg = reg.includes('Regular')
    ? 'Regular'
    : reg.includes('Unregistered')
      ? 'Unregistered'
      : reg;
  if (company.gstin) return `${shortReg}. GSTIN:${company.gstin}`;
  return `${shortReg}.`;
}

export default function CompanySwitcher({ className = '' }) {
  const {
    companies,
    activeCompany,
    switchCompany,
    fiscalYears,
    activeYear,
    setActiveYear,
    addFiscalYear,
  } = useCompanies();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [newYear, setNewYear] = useState('');
  const [creatingYear, setCreatingYear] = useState(false);
  const [switching, setSwitching] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    setOpen(false);
    setYearOpen(false);
    setCreatingYear(false);
    setQuery('');
  }, [location.pathname]);

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setYearOpen(false);
        setCreatingYear(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? companies
      : companies.filter(
          (c) =>
            (c.name || '').toLowerCase().includes(q)
            || (c.gstin || '').toLowerCase().includes(q)
            || (c.alias || '').toLowerCase().includes(q)
        );
    return [...list].sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)));
  }, [companies, query]);

  const selectCompany = async (company) => {
    if (String(company.id) === String(activeCompany?.id)) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await switchCompany(company.id);
      setOpen(false);
      setQuery('');
      toast.success(`Switched to ${company.name}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not switch company'));
    } finally {
      setSwitching(false);
    }
  };

  const createYear = async () => {
    const value = newYear.trim();
    if (!/^\d{4}-\d{2}$/.test(value)) {
      toast.error('Use format like 2027-28');
      return;
    }
    try {
      await addFiscalYear(value);
      setCreatingYear(false);
      setNewYear('');
      setYearOpen(false);
      toast.success(`Year ${value} created`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create year'));
    }
  };

  const name = activeCompany?.name || 'Select company';

  return (
    <div className={cn('relative', className)} ref={rootRef} data-tour="company-switcher">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setYearOpen(false);
          setCreatingYear(false);
        }}
        className={cn(
          'inline-flex items-center gap-2 max-w-[min(100vw-8rem,320px)] rounded-lg border px-2.5 py-1.5 text-left transition-colors',
          open
            ? 'border-primary bg-primary/5'
            : 'border-border hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:border-slate-600'
        )}
        aria-expanded={open}
        aria-label="Switch company"
      >
        <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {activeYear}
        </span>
        <span className="min-w-0 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
          {name}
        </span>
        <FaChevronDown
          size={10}
          className={cn('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute left-0 top-full z-[90] mt-2 w-[min(calc(100vw-1.5rem),360px)] rounded-xl border border-border bg-surface soft-shadow overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b border-border p-2.5">
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setYearOpen((v) => !v);
                    setCreatingYear(false);
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
                    yearOpen
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-border text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  )}
                >
                  <FaCalendarAlt size={11} className="text-primary" />
                  <span className={cn(yearOpen && 'rounded bg-primary px-1.5 py-0.5 text-white')}>
                    {activeYear}
                  </span>
                  <FaChevronDown size={9} className={cn('text-slate-400', yearOpen && 'rotate-180')} />
                </button>

                <AnimatePresence>
                  {yearOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 2 }}
                      className="absolute left-0 top-full z-[100] mt-1.5 w-44 rounded-lg border border-border bg-surface soft-shadow overflow-hidden"
                    >
                      {creatingYear ? (
                        <div className="p-2 space-y-2">
                          <input
                            autoFocus
                            value={newYear}
                            onChange={(e) => setNewYear(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') createYear();
                              if (e.key === 'Escape') setCreatingYear(false);
                            }}
                            placeholder="2027-28"
                            className="w-full rounded-md border border-border px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary dark:bg-slate-800"
                          />
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={createYear}
                              className="flex-1 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-white"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setCreatingYear(false)}
                              className="rounded-md border border-border px-2 py-1 text-[11px]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setCreatingYear(true);
                              setNewYear('');
                            }}
                            className="w-full px-3 py-2.5 text-center text-sm font-semibold text-primary hover:bg-primary/5"
                          >
                            + Create Year
                          </button>
                          <div className="max-h-40 overflow-y-auto border-t border-border">
                            {fiscalYears.map((year) => (
                              <button
                                key={year}
                                type="button"
                                onClick={() => {
                                  setActiveYear(year);
                                  setYearOpen(false);
                                  toast.success(`FY ${year} selected`);
                                }}
                                className={cn(
                                  'w-full px-3 py-2 text-left text-sm',
                                  year === activeYear
                                    ? 'bg-slate-100 font-semibold text-slate-800 dark:bg-slate-800 dark:text-white'
                                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60'
                                )}
                              >
                                {year}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative min-w-0 flex-1">
                <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={11} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search here"
                  className="w-full rounded-lg border border-border bg-slate-50 pl-8 pr-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary dark:bg-slate-800 dark:border-slate-600"
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto scrollbar-thin">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted">No companies found</p>
              ) : (
                filtered.map((company) => {
                  const active = String(company.id) === String(activeCompany?.id);
                  return (
                    <button
                      key={company.id}
                      type="button"
                      disabled={switching}
                      onClick={() => selectCompany(company)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-border/70 last:border-b-0 transition-colors disabled:opacity-60',
                        active
                          ? 'bg-emerald-50 border-b-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      )}
                    >
                      <div
                        className={cn(
                          'h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                          active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                        )}
                      >
                        {getInitials(company.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm font-semibold truncate', active ? 'text-emerald-800 dark:text-emerald-200' : 'text-slate-800 dark:text-slate-100')}>
                          {company.name}
                          {company.alias ? ` - ${company.alias}` : ''}
                        </p>
                        <p className="text-[11px] text-muted truncate">{companySubtitle(company)}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t border-border p-2 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate('/companies/create');
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5"
              >
                <FaPlus size={10} />
                Create Company
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate('/companies');
                }}
                className="w-full rounded-lg px-3 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Manage all companies
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
