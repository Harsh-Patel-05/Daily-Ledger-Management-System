import { useEffect, useMemo, useState } from 'react';
import {
  FaChevronDown, FaChevronRight, FaPlus, FaEdit, FaTrash, FaEye,
  FaExpand, FaCompress, FaSearch, FaColumns,
} from 'react-icons/fa';
import { useChartOfAccounts } from '../../context/ChartOfAccountsContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/formatters';
import { cn } from '../../utils/formatters';
import {
  ACCOUNT_NATURES,
  childrenOf,
  countLedgers,
  countSubgroups,
  natureColor,
} from '../../data/chartOfAccounts';
import {
  Breadcrumbs, Card, SearchBox, Filter, Button, Input, Modal,
  ConfirmationDialog, EmptyState, Badge,
} from '../../components/ui';

const COLUMN_OPTIONS = [
  { key: 'nature', label: 'Nature' },
  { key: 'type', label: 'Type' },
  { key: 'subgroups', label: 'Sub groups' },
  { key: 'ledgers', label: 'Ledgers' },
];

export default function ChartsOfAccount() {
  const { groups, addSubgroup, updateGroup, removeGroup } = useChartOfAccounts();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [nature, setNature] = useState('');
  const [columnSearch, setColumnSearch] = useState(false);
  const [colQuery, setColQuery] = useState({ name: '', nature: '', type: '' });
  const [visibleCols, setVisibleCols] = useState(() =>
    Object.fromEntries(COLUMN_OPTIONS.map((c) => [c.key, true]))
  );
  const [showCols, setShowCols] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set(groups.filter((g) => !g.parentId).map((g) => g.id)));

  const [drawer, setDrawer] = useState(null);
  const [subgroupName, setSubgroupName] = useState('');
  const [editRow, setEditRow] = useState(null);
  const [editName, setEditName] = useState('');
  const [viewRow, setViewRow] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const roots = useMemo(() => childrenOf(groups, null), [groups]);

  const matches = (group) => {
    const q = search.trim().toLowerCase();
    if (nature && group.nature !== nature) return false;
    if (q && !group.name.toLowerCase().includes(q) && !group.nature.toLowerCase().includes(q)) return false;
    if (columnSearch) {
      if (colQuery.name && !group.name.toLowerCase().includes(colQuery.name.toLowerCase())) return false;
      if (colQuery.nature && !group.nature.toLowerCase().includes(colQuery.nature.toLowerCase())) return false;
      const typeLabel = group.isPrimary ? 'primary' : 'sub group';
      if (colQuery.type && !typeLabel.includes(colQuery.type.toLowerCase())) return false;
    }
    return true;
  };

  const visibleIds = useMemo(() => {
    const ids = new Set();
    const walk = (node, ancestors = []) => {
      const kids = childrenOf(groups, node.id);
      const selfOk = matches(node);
      const childHits = kids.map((k) => walk(k, [...ancestors, node.id])).some(Boolean);
      if (selfOk || childHits) {
        ids.add(node.id);
        ancestors.forEach((a) => ids.add(a));
        return true;
      }
      return false;
    };
    roots.forEach((r) => walk(r));
    return ids;
  }, [groups, roots, search, nature, columnSearch, colQuery]);

  useEffect(() => {
    if (!search && !nature && !columnSearch) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }, [visibleIds, search, nature, columnSearch]);

  const rows = useMemo(() => {
    const out = [];
    const walk = (node, depth) => {
      if (!visibleIds.has(node.id)) return;
      const kids = childrenOf(groups, node.id).filter((k) => visibleIds.has(k.id));
      out.push({ group: node, depth, hasChildren: kids.length > 0 });
      if (expanded.has(node.id)) kids.forEach((k) => walk(k, depth + 1));
    };
    roots.forEach((r) => walk(r, 0));
    return out;
  }, [groups, roots, expanded, visibleIds]);

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(groups.map((g) => g.id)));
  const collapseAll = () => setExpanded(new Set());

  const openAdd = (group) => {
    setDrawer(group);
    setSubgroupName('');
  };

  const saveSubgroup = () => {
    if (!subgroupName.trim()) {
      toast.error('Subgroup name is required');
      return;
    }
    addSubgroup(drawer, subgroupName);
    setExpanded((prev) => new Set(prev).add(drawer.id));
    toast.success('Subgroup added');
    setDrawer(null);
  };

  const saveEdit = () => {
    if (!editName.trim()) {
      toast.error('Group name is required');
      return;
    }
    updateGroup(editRow.id, { name: editName.trim() });
    toast.success('Group updated');
    setEditRow(null);
  };

  const confirmDelete = () => {
    const row = groups.find((g) => g.id === deleteId);
    if (row?.isSystem) {
      toast.error('System groups cannot be deleted');
      setDeleteId(null);
      return;
    }
    if (childrenOf(groups, deleteId).length) {
      toast.error('Remove subgroups first');
      setDeleteId(null);
      return;
    }
    removeGroup(deleteId);
    toast.success('Subgroup deleted');
    setDeleteId(null);
  };

  const stats = useMemo(() => ({
    groups: groups.length,
    primary: groups.filter((g) => g.isPrimary).length,
    ledgers: groups.reduce((n, g) => n + (g.ledgers?.length || 0), 0),
  }), [groups]);

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'Account Master', to: '/accounts/charts' }, { label: 'Charts of Account' }]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Charts of Account</h1>
          <p className="text-sm text-muted mt-0.5">
            Ledger groups linked to the balance sheet · {stats.primary} primary · {stats.groups} groups · {stats.ledgers} ledgers
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}><FaExpand size={11} /> Expand all</Button>
          <Button variant="outline" size="sm" onClick={collapseAll}><FaCompress size={11} /> Collapse</Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-3 mb-5">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search group name or nature..."
            className="w-full"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Filter
              value={nature}
              onChange={setNature}
              label="All natures"
              options={ACCOUNT_NATURES.map((n) => ({ value: n, label: n }))}
            />
            <Button
              variant={columnSearch ? 'soft' : 'outline'}
              size="sm"
              onClick={() => setColumnSearch((v) => !v)}
            >
              <FaSearch size={11} /> Column search
            </Button>
            <div className="relative">
              <Button variant="outline" size="sm" onClick={() => setShowCols((v) => !v)}>
                <FaColumns size={11} /> Show columns
              </Button>
              {showCols && (
                <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-border bg-surface py-2 card-shadow">
                  {COLUMN_OPTIONS.map((col) => (
                    <label key={col.key} className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <input
                        type="checkbox"
                        checked={visibleCols[col.key]}
                        onChange={(e) => setVisibleCols((prev) => ({ ...prev, [col.key]: e.target.checked }))}
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            type="default"
            title="No groups found"
            description="Try clearing search or nature filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <th className="px-3 py-3">Group name</th>
                  {visibleCols.nature && <th className="px-3 py-3">Nature</th>}
                  {visibleCols.type && <th className="px-3 py-3">Type</th>}
                  {visibleCols.subgroups && <th className="px-3 py-3 text-right">Sub groups</th>}
                  {visibleCols.ledgers && <th className="px-3 py-3 text-right">Ledgers</th>}
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
                {columnSearch && (
                  <tr className="border-b border-border bg-slate-50/80 dark:bg-slate-800/40">
                    <th className="px-3 py-2">
                      <input
                        value={colQuery.name}
                        onChange={(e) => setColQuery((q) => ({ ...q, name: e.target.value }))}
                        placeholder="Search name"
                        className="w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs dark:bg-slate-800"
                      />
                    </th>
                    {visibleCols.nature && (
                      <th className="px-3 py-2">
                        <input
                          value={colQuery.nature}
                          onChange={(e) => setColQuery((q) => ({ ...q, nature: e.target.value }))}
                          placeholder="Nature"
                          className="w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs dark:bg-slate-800"
                        />
                      </th>
                    )}
                    {visibleCols.type && (
                      <th className="px-3 py-2">
                        <input
                          value={colQuery.type}
                          onChange={(e) => setColQuery((q) => ({ ...q, type: e.target.value }))}
                          placeholder="Primary / sub"
                          className="w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs dark:bg-slate-800"
                        />
                      </th>
                    )}
                    {visibleCols.subgroups && <th />}
                    {visibleCols.ledgers && <th />}
                    <th />
                  </tr>
                )}
              </thead>
              <tbody>
                {rows.map(({ group, depth, hasChildren }) => (
                  <tr key={group.id} className="border-b border-border/70 hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1" style={{ paddingLeft: depth * 18 }}>
                        <button
                          type="button"
                          disabled={!hasChildren}
                          onClick={() => toggle(group.id)}
                          className={cn(
                            'p-1 rounded-md',
                            hasChildren ? 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700' : 'text-transparent'
                          )}
                        >
                          {expanded.has(group.id) ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewRow(group)}
                          className="font-medium text-slate-800 dark:text-slate-100 hover:text-primary text-left"
                        >
                          {group.name}
                        </button>
                      </div>
                    </td>
                    {visibleCols.nature && (
                      <td className="px-3 py-2.5">
                        <span className={cn('inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium', natureColor(group.nature))}>
                          {group.nature}
                        </span>
                      </td>
                    )}
                    {visibleCols.type && (
                      <td className="px-3 py-2.5">
                        <Badge variant={group.isPrimary ? 'primary' : 'default'}>
                          {group.isPrimary ? 'Primary' : 'Sub group'}
                        </Badge>
                      </td>
                    )}
                    {visibleCols.subgroups && (
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                        {countSubgroups(groups, group.id)}
                      </td>
                    )}
                    {visibleCols.ledgers && (
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                        {countLedgers(groups, group.id)}
                      </td>
                    )}
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-0.5">
                        <button
                          type="button"
                          title="View ledgers"
                          onClick={() => setViewRow(group)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 dark:hover:bg-blue-900/30"
                        >
                          <FaEye size={12} />
                        </button>
                        <button
                          type="button"
                          title="Add subgroup"
                          onClick={() => openAdd(group)}
                          className="p-2 rounded-lg hover:bg-primary/10 text-primary"
                        >
                          <FaPlus size={12} />
                        </button>
                        {!group.isPrimary && (
                          <button
                            type="button"
                            title="Rename"
                            onClick={() => { setEditRow(group); setEditName(group.name); }}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 dark:hover:bg-slate-700"
                          >
                            <FaEdit size={12} />
                          </button>
                        )}
                        {!group.isSystem && (
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => setDeleteId(group.id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-danger dark:hover:bg-red-900/30"
                          >
                            <FaTrash size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!drawer}
        onClose={() => setDrawer(null)}
        title="Add subgroup"
        footer={(
          <>
            <Button variant="outline" onClick={() => setDrawer(null)}>Cancel</Button>
            <Button onClick={saveSubgroup}>Save</Button>
          </>
        )}
      >
        <p className="text-sm text-muted mb-4">
          New subgroup will be created under <span className="font-semibold text-slate-700 dark:text-slate-200">{drawer?.name}</span> ({drawer?.nature}).
        </p>
        <Input
          label="Subgroup name"
          required
          value={subgroupName}
          onChange={(e) => setSubgroupName(e.target.value)}
          placeholder="e.g. Prepaid Expenses"
        />
      </Modal>

      <Modal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        title="Rename subgroup"
        footer={(
          <>
            <Button variant="outline" onClick={() => setEditRow(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </>
        )}
      >
        <Input label="Group name" required value={editName} onChange={(e) => setEditName(e.target.value)} />
      </Modal>

      <Modal
        open={!!viewRow}
        onClose={() => setViewRow(null)}
        title={viewRow?.name}
        size="lg"
        footer={<Button variant="outline" onClick={() => setViewRow(null)}>Close</Button>}
      >
        {viewRow && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className={cn('inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium', natureColor(viewRow.nature))}>
                {viewRow.nature}
              </span>
              <Badge>{viewRow.isPrimary ? 'Primary group' : 'Sub group'}</Badge>
            </div>
            {(viewRow.ledgers || []).length === 0 ? (
              <p className="text-sm text-muted">No ledgers in this group yet. Ledgers are created from Account Master.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs uppercase text-muted">
                      <th className="px-3 py-2">Ledger</th>
                      <th className="px-3 py-2 text-right">Opening</th>
                      <th className="px-3 py-2">Dr/Cr</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewRow.ledgers.map((led) => (
                      <tr key={led.id} className="border-t border-border">
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{led.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(led.opening)}</td>
                        <td className="px-3 py-2 text-muted">{led.side}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Button variant="soft" size="sm" onClick={() => { setViewRow(null); openAdd(viewRow); }}>
              <FaPlus size={11} /> Add subgroup
            </Button>
          </div>
        )}
      </Modal>

      <ConfirmationDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete subgroup"
        message="This subgroup will be removed from the chart of accounts."
        confirmText="Delete"
      />
    </div>
  );
}
