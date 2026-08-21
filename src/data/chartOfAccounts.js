export const ACCOUNT_NATURES = ['Assets', 'Liabilities', 'Income', 'Expenses'];

export function childrenOf(groups, parentId) {
  const pid = parentId ?? null;
  return groups
    .filter((g) => (g.parentId ?? null) === pid)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function countSubgroups(groups, id) {
  const kids = childrenOf(groups, id);
  return kids.reduce((sum, child) => sum + 1 + countSubgroups(groups, child.id), 0);
}

export function countLedgers(groups, id) {
  const self = groups.find((g) => g.id === id);
  const own = self?.ledgers?.length || 0;
  return childrenOf(groups, id).reduce((sum, child) => sum + countLedgers(groups, child.id), own);
}

export function natureColor(nature) {
  const map = {
    Assets: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    Liabilities: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    Income: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    Expenses: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  return map[nature] || 'bg-slate-100 text-slate-600';
}
