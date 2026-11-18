import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { caseLink, formatDate, fmtNumber, pageList } from './caseUi';
import { Avatar, Card, EmptyState, Icon, SeverityPill, StatusText } from './parts';
import StudentProfileLink from './StudentProfileLink';

/**
 * Paginated case table with optional filter tabs.
 * - Client mode (default): `cases` is the full list; remount (change `key`) to return to page 1.
 * - Server mode: pass `onPageChange`, `page` and `total`; `cases` is the current page only.
 */
export default function CasesTable({
  cases,
  loading = false,
  role,
  title = 'Cases',
  icon = 'description',
  tabs,
  activeTab,
  onTabChange,
  pageSize = 10,
  showStudent = true,
  total,
  page: serverPage,
  onPageChange,
}) {
  const navigate = useNavigate();
  const [localPage, setLocalPage] = useState(0);
  const serverMode = typeof onPageChange === 'function';
  const page = serverMode ? serverPage || 0 : localPage;
  const count = serverMode ? total || 0 : cases.length;
  const setPage = (next) => {
    const value = typeof next === 'function' ? next(page) : next;
    if (serverMode) onPageChange(value);
    else setLocalPage(value);
  };
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const rows = serverMode ? cases : cases.slice(page * pageSize, (page + 1) * pageSize);
  const rangeStart = count ? page * pageSize + 1 : 0;
  const rangeEnd = Math.min((page + 1) * pageSize, count);
  const columns = showStudent ? 6 : 5;

  return (
    <Card
      title={title}
      icon={icon}
      action={
        tabs && (
          <div className="flex flex-wrap gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={`px-3.5 py-1.5 rounded-lg text-sm transition-colors ${
                  activeTab === tab.key ? 'bg-[#3d3793] text-white font-medium' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )
      }
    >
      {/* Phones: one tappable card per case instead of a wide table. */}
      <ul className="sm:hidden divide-y divide-slate-100 px-4">
        {loading &&
          Array.from({ length: pageSize }, (_, i) => (
            <li key={i} className="py-4">
              <div className="h-4 w-2/3 rounded bg-slate-100 animate-pulse" />
              <div className="mt-2 h-3 w-1/2 rounded bg-slate-100 animate-pulse" />
            </li>
          ))}
        {!loading && rows.length === 0 && (
          <li>
            <EmptyState>No cases in this view.</EmptyState>
          </li>
        )}
        {!loading &&
          rows.map((c) => (
            <li
              key={c.id}
              onClick={() => navigate(caseLink(role, c.id))}
              className="py-3.5 cursor-pointer active:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{c.offense}</p>
                  <p className="mt-0.5 text-xs text-slate-500 truncate">
                    {c.caseId} · {formatDate(c.date)}
                  </p>
                </div>
                <SeverityPill severity={c.severity} />
              </div>
              {showStudent && (
                <div className="mt-2 flex items-center gap-2 min-w-0">
                  <Avatar name={c.student} seed={c.id} />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800 truncate">{c.student}</p>
                    <p className="text-xs text-slate-500 truncate">{c.enrollment}</p>
                  </div>
                </div>
              )}
              <div className="mt-2 text-sm">
                <StatusText status={c.status} />
              </div>
            </li>
          ))}
      </ul>

      <div className="hidden sm:block overflow-x-auto px-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 bg-[#f6f6fa]">
              <th className="font-medium px-3 py-2.5 rounded-l-lg">Case ID</th>
              {showStudent && <th className="font-medium px-3 py-2.5">Student</th>}
              <th className="font-medium px-3 py-2.5">Offence</th>
              <th className="font-medium px-3 py-2.5">Severity</th>
              <th className="font-medium px-3 py-2.5">Status</th>
              <th className="font-medium px-3 py-2.5 rounded-r-lg">Incident date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading &&
              Array.from({ length: pageSize }, (_, i) => (
                <tr key={i}>
                  <td colSpan={columns} className="px-3 py-4">
                    <div className="h-4 rounded bg-slate-100 animate-pulse" />
                  </td>
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns}>
                  <EmptyState>No cases in this view.</EmptyState>
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(caseLink(role, c.id))}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{c.caseId}</td>
                  {showStudent && (
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.student} seed={c.id} />
                        <div>
                          <p className="font-medium text-slate-900 whitespace-nowrap">{c.student}</p>
                          <p className="text-xs text-slate-500">{c.enrollment}</p>
                          <StudentProfileLink enrollment={c.enrollment} className="mt-0.5" />
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{c.offense}</td>
                  <td className="px-3 py-3">
                    <SeverityPill severity={c.severity} />
                  </td>
                  <td className="px-3 py-3">
                    <StatusText status={c.status} />
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(c.date)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 text-sm text-slate-500">
        <span className="tabular-nums">
          Showing {rangeStart}–{rangeEnd} of {fmtNumber(count)} cases
        </span>
        {totalPages > 1 && (
          <nav className="flex items-center gap-1" aria-label="Pagination">
            <button
              type="button"
              aria-label="Previous page"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-40"
            >
              <Icon name="chevron_left" className="text-[20px]" />
            </button>
            {pageList(page, totalPages).map((p) =>
              typeof p === 'string' ? (
                <span key={p} className="px-1.5">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  aria-current={p === page ? 'page' : undefined}
                  onClick={() => setPage(p)}
                  className={`h-8 min-w-8 px-2 rounded-lg tabular-nums ${
                    p === page ? 'bg-[#3d3793] text-white font-medium' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {p + 1}
                </button>
              )
            )}
            <button
              type="button"
              aria-label="Next page"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 disabled:opacity-40"
            >
              <Icon name="chevron_right" className="text-[20px]" />
            </button>
          </nav>
        )}
      </div>
    </Card>
  );
}
