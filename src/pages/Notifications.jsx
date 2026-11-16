import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DACLayout from '../components/layout/DACLayout';
import { Button, Card, EmptyState, Icon, PageHeader } from '../components/cases/parts';
import { caseLink, formatDateTime } from '../components/cases/caseUi';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markNotificationRead } from '../services/api';

export default function Notifications() {
  const { role } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getNotifications()
      .then((data) => mounted && setNotifications(Array.isArray(data) ? data : []))
      .catch((loadError) => mounted && setError(loadError?.message || 'Failed to load notifications.'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const visible = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications),
    [notifications, filter]
  );

  const markRead = async (id) => {
    await markNotificationRead(id).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    await Promise.all(unread.map((n) => markNotificationRead(n.id).catch(() => {})));
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <DACLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="Notifications"
          subtitle="Case escalations and decisions that involve you."
          action={
            <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
              <Icon name="done_all" className="text-[18px]" />
              Mark all as read
            </Button>
          }
        />

        <Card
          title={`${unreadCount} unread`}
          icon="notifications"
          action={
            <div className="flex gap-1">
              {['all', 'unread'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm ${
                    filter === key ? 'bg-[#3d3793] text-white font-medium' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {key === 'all' ? 'All' : 'Unread'}
                </button>
              ))}
            </div>
          }
        >
          {error && <p className="mx-6 mb-4 text-sm text-rose-700">{error}</p>}
          {loading && <div className="mx-6 mb-6 h-24 rounded-lg bg-slate-100 animate-pulse" />}
          {!loading && visible.length === 0 && <EmptyState icon="notifications_off">You're all caught up.</EmptyState>}
          {!loading && visible.length > 0 && (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {visible.map((n) => (
                <li key={n.id} className={`flex items-start gap-4 px-6 py-4 ${n.is_read ? '' : 'bg-indigo-50/40'}`}>
                  <span
                    className={`mt-0.5 h-9 w-9 shrink-0 rounded-full flex items-center justify-center ${
                      n.is_read ? 'bg-slate-100 text-slate-500' : 'bg-[#e6e4fa] text-[#3d3793]'
                    }`}
                  >
                    <Icon name={n.case_id ? 'folder_open' : 'notifications'} className="text-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${n.is_read ? 'text-slate-700' : 'text-slate-900 font-medium'}`}>{n.message}</p>
                    <p className="text-xs text-slate-500 mt-1">{formatDateTime(n.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {n.case_id && (
                      <Link
                        to={caseLink(role, n.case_id)}
                        onClick={() => !n.is_read && markRead(n.id)}
                        className="text-sm font-medium text-[#3d3793] hover:underline"
                      >
                        Open case
                      </Link>
                    )}
                    {!n.is_read && (
                      <button type="button" onClick={() => markRead(n.id)} className="text-sm text-slate-500 hover:text-slate-800">
                        Mark read
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </DACLayout>
  );
}
