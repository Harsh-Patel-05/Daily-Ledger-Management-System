import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBell, FaCheckDouble, FaExclamationTriangle, FaClock, FaFileInvoiceDollar, FaCalendarCheck } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Breadcrumbs, Card, Button, Badge, EmptyState, Filter } from '../components/ui';

const typeConfig = {
  payment_reminder: { icon: FaBell, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30', label: 'Reminder' },
  overdue: { icon: FaExclamationTriangle, color: 'bg-red-50 text-red-600 dark:bg-red-900/30', label: 'Overdue' },
  pending_bill: { icon: FaFileInvoiceDollar, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30', label: 'Pending' },
  upcoming_due: { icon: FaCalendarCheck, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30', label: 'Upcoming' },
};

export default function Notifications() {
  const { notifications, markNotificationRead, markAllNotificationsRead, unreadCount } = useApp();
  const [filter, setFilter] = useState('');

  const filtered = filter
    ? notifications.filter((n) => n.type === filter)
    : notifications;

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: 'Notifications' }]} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Notifications</h1>
          <p className="text-sm text-muted mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllNotificationsRead}>
            <FaCheckDouble size={12} /> Mark all read
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-5">
          <Filter
            value={filter}
            onChange={setFilter}
            label="All Types"
            options={[
              { value: 'payment_reminder', label: 'Payment Reminders' },
              { value: 'overdue', label: 'Overdue' },
              { value: 'pending_bill', label: 'Pending Bills' },
              { value: 'upcoming_due', label: 'Upcoming Due' },
            ]}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState type="notifications" title="No notifications" description="You're all caught up!" />
        ) : (
          <div className="space-y-2">
            {filtered.map((n, i) => {
              const cfg = typeConfig[n.type] || typeConfig.payment_reminder;
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => markNotificationRead(n.id)}
                  className={`flex gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                    n.read
                      ? 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                      : 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
                >
                  <div className={`p-3 rounded-xl shrink-0 h-fit ${cfg.color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm ${n.read ? 'font-medium' : 'font-semibold'} text-slate-800 dark:text-slate-100`}>
                            {n.title}
                          </p>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                        </div>
                        <p className="text-sm text-muted mt-0.5">{n.message}</p>
                      </div>
                      <Badge variant={n.type === 'overdue' ? 'danger' : n.type === 'upcoming_due' ? 'success' : 'primary'}>
                        {cfg.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-muted flex items-center gap-1">
                        <FaClock size={10} />
                        {formatDate(n.createdAt)}
                      </span>
                      {n.amount && (
                        <span className="text-xs font-semibold text-amber-600">{formatCurrency(n.amount)}</span>
                      )}
                      {n.customerId && (
                        <Link
                          to={`/customers/${n.customerId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-primary hover:underline"
                        >
                          View customer
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
