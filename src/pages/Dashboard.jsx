import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DACLayout from '../components/layout/DACLayout';
import CasesTable from '../components/cases/CasesTable';
import { Donut, TrendChart } from '../components/cases/charts';
import { Avatar, Card, Icon } from '../components/cases/parts';
import { TREND_RANGES, buildTrend } from '../components/cases/trend';
import {
  ACTIVE_STATUSES,
  STAGE_FOR_ROLE,
  caseLink,
  fmtNumber,
  formatDate,
  mapCase,
  matchesFilter,
  searchCases,
  searchStudents,
  statusLabel,
  studentProfilePath,
} from '../components/cases/caseUi';
import { useAuth } from '../context/AuthContext';
import { getCases } from '../services/api';

const SUBTITLES = {
  admin: "Here's the current status of disciplinary cases.",
  dsw: 'Cases moving through Dean of Student Welfare review.',
  chief_warden: 'Cases waiting for your first review, and everything else in progress.',
  warden: 'Cases you have registered and where they are in the review chain.',
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Dashboard for admin, DSW, chief warden and warden. Reviewers see the cases
 * waiting on their workflow stage; wardens see the cases they registered.
 */
export default function Dashboard() {
  const { role, currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [filter, setFilter] = useState('all');
  const [trendRange, setTrendRange] = useState('30d');
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isWarden = role === 'warden';
  const myStage = STAGE_FOR_ROLE[role];

  useEffect(() => {
    let mounted = true;
    getCases(isWarden ? { role: 'my_created_only' } : {})
      .then((rows) => mounted && setCases(rows.map(mapCase)))
      .catch((loadError) => mounted && setError(loadError?.message || 'Failed to load cases.'))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [isWarden]);

  const stats = useMemo(() => {
    const byStatus = Object.fromEntries([...ACTIVE_STATUSES, 'resolved'].map((s) => [s, 0]));
    let severe = 0;
    for (const c of cases) {
      if (c.status in byStatus) byStatus[c.status] += 1;
      if (c.severity === 'high' || c.severity === 'critical') severe += 1;
    }
    const active = ACTIVE_STATUSES.reduce((sum, s) => sum + byStatus[s], 0);
    return { total: cases.length, active, resolved: byStatus.resolved, severe, byStatus };
  }, [cases]);

  const filtered = useMemo(() => cases.filter((c) => matchesFilter(c, filter, myStage)), [cases, filter, myStage]);

  // Reviewers: oldest cases waiting on them. Wardens: their latest registrations.
  const sideList = useMemo(() => {
    if (isWarden) return [...cases].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
    return cases
      .filter((c) => c.status === myStage)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 4);
  }, [cases, isWarden, myStage]);

  const trend = useMemo(() => buildTrend(cases, TREND_RANGES.find((r) => r.key === trendRange)), [cases, trendRange]);
  const trendTotal = trend.reduce((sum, p) => sum + p.value, 0);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const studentResults = searchStudents(cases, search).map((c) => ({
      key: `student-${c.enrollment}`,
      title: c.student,
      subtitle: `Enrollment ${c.enrollment}`,
      meta: 'View Profile →',
      metaClassName: 'font-semibold text-[#3d3793]',
      leading: <Avatar name={c.student} seed={Number(c.enrollment) || 0} size="h-8 w-8" />,
      to: studentProfilePath(c.enrollment),
    }));
    const caseResults = searchCases(cases, search)
      .slice(0, 8)
      .map((c) => ({
        key: c.id,
        title: `${c.caseId} · ${c.student}`,
        subtitle: [c.enrollment, c.offense].filter(Boolean).join(' · '),
        meta: statusLabel(c.status),
        to: caseLink(role, c.id),
      }));
    return [...studentResults, ...caseResults];
  }, [cases, search, role]);

  const statCards = [
    {
      key: 'all', label: isWarden ? 'Registered by You' : 'Total Cases', value: stats.total, icon: 'folder_open', wave: true,
      card: 'bg-[#eeedfa] border-[#e0ddf6]', chip: 'bg-[#dcd9f5] text-[#4b44b5]', labelColor: 'text-slate-800', ring: 'ring-[#4b44b5]',
    },
    {
      key: 'active', label: 'Active Cases', value: stats.active, icon: 'schedule',
      card: 'bg-[#fbf1e5] border-[#f2e1cc]', chip: 'bg-[#f4dfc4] text-[#9a5b16]', labelColor: 'text-[#9a5b16]', ring: 'ring-[#c98a3f]',
    },
    {
      key: 'resolved', label: 'Resolved Cases', value: stats.resolved, icon: 'check',
      card: 'bg-[#eaf4ee] border-[#d5e9dc]', chip: 'bg-[#d2e8da] text-[#2f7a4d]', labelColor: 'text-slate-800', ring: 'ring-[#4f9a6d]',
    },
    {
      key: 'severe', label: 'High & Critical', value: stats.severe, icon: 'warning',
      card: 'bg-[#f8e7ea] border-[#efd2d8]', chip: 'bg-[#f1d0d7] text-[#b42b44]', labelColor: 'text-[#9f1d35]', ring: 'ring-[#c2475e]',
    },
  ];

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    ...(myStage ? [{ key: 'mine', label: 'Awaiting You' }] : []),
    { key: 'resolved', label: 'Resolved' },
    { key: 'severe', label: 'High & Critical' },
  ];

  // Every case falls in exactly one slice. DSW's case list excludes cases still
  // with the Chief Warden, so that slice is hidden for DSW.
  const distribution = [
    { key: 'resolved', label: 'Resolved', color: '#7cc39a' },
    { key: 'pending_chief', label: 'With Chief Warden', color: '#f0b44c' },
    { key: 'pending_dsw', label: 'With DSW', color: '#8b84e8' },
    { key: 'pending_admin', label: 'With Admin', color: '#c08fe8' },
  ]
    .filter((slice) => role !== 'dsw' || slice.key !== 'pending_chief')
    .map((slice) => ({ ...slice, value: stats.byStatus[slice.key] }));

  const roleName = { admin: 'Admin', dsw: 'DSW', chief_warden: 'Chief Warden', warden: 'Warden' }[role];
  const displayName = currentUser?.name?.split(' ')[0] || roleName;

  return (
    <DACLayout searchValue={search} onSearchChange={setSearch} searchResults={searchResults}>
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="border-l-4 border-[#3d3793] pl-4">
          <h1 className="text-2xl sm:text-[28px] text-slate-900 tracking-tight">
            {greeting()}, <span className="font-semibold">{displayName}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">{SUBTITLES[role] || SUBTITLES.admin}</p>
        </div>

        {error && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{error}</p>
        )}

        {/* Stat cards: click filters the table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              aria-pressed={filter === item.key}
              className={`relative overflow-hidden text-left rounded-2xl border px-6 py-6 flex items-center gap-4 transition-shadow hover:shadow-sm ${item.card} ${
                filter === item.key ? `ring-2 ${item.ring} ring-offset-2 ring-offset-[#f6f6fa]` : ''
              }`}
            >
              {item.wave && (
                <svg aria-hidden="true" viewBox="0 0 200 80" preserveAspectRatio="none" className="absolute right-0 bottom-0 w-1/2 h-3/4 text-[#d9d5f4]">
                  <path d="M0,70 C30,66 50,72 80,58 C110,44 125,20 160,18 C180,17 192,24 200,28 L200,80 L0,80 Z" fill="currentColor" />
                </svg>
              )}
              <span className={`relative h-12 w-12 shrink-0 rounded-full flex items-center justify-center ${item.chip}`}>
                <Icon name={item.icon} className="text-[26px]" />
              </span>
              <span className="relative min-w-0">
                <span className={`block text-sm font-semibold ${item.labelColor}`}>{item.label}</span>
                <span className="block mt-1 text-3xl font-semibold text-slate-900 tabular-nums">
                  {loading ? '–' : fmtNumber(item.value)}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 space-y-6">
            <CasesTable
              key={filter}
              cases={filtered}
              loading={loading}
              role={role}
              title="Recent Cases"
              tabs={tabs}
              activeTab={filter}
              onTabChange={setFilter}
              pageSize={5}
            />

            <Card
              title="Case Trend"
              icon="trending_up"
              action={
                <div className="flex gap-1 bg-[#f6f6fa] rounded-lg p-1">
                  {TREND_RANGES.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setTrendRange(r.key)}
                      className={`px-3 py-1 rounded-md text-xs ${
                        trendRange === r.key ? 'bg-[#3d3793] text-white font-medium' : 'text-slate-600 hover:bg-white'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="px-6 pb-5">
                {loading ? (
                  <div className="h-48 rounded-lg bg-slate-100 animate-pulse" />
                ) : (
                  <>
                    <p className="text-xs text-slate-500 mb-2">
                      {trendTotal ? `${fmtNumber(trendTotal)} cases reported in this period` : 'No cases reported in this period'}
                    </p>
                    <TrendChart points={trend} />
                  </>
                )}
              </div>
            </Card>
          </div>

          <div className="xl:col-span-4 space-y-6">
            <Card
              title={isWarden ? 'Your Recent Registrations' : 'Needs Your Decision'}
              icon={isWarden ? 'history' : 'gavel'}
              action={
                <button
                  type="button"
                  onClick={() => setFilter(isWarden ? 'active' : 'mine')}
                  className="flex items-center gap-1 text-sm font-medium text-[#3d3793] hover:underline"
                >
                  View all <Icon name="arrow_forward" className="text-[18px]" />
                </button>
              }
            >
              <ul className="px-3 pb-3">
                {!loading && sideList.length === 0 && (
                  <li className="px-3 py-8 flex flex-col items-center gap-2 text-sm text-slate-500">
                    <Icon name="done_all" className="text-[24px] text-emerald-500" />
                    {isWarden ? 'No cases registered yet.' : 'Nothing waiting on you.'}
                  </li>
                )}
                {sideList.map((c) => (
                  <li key={c.id} className="border-t border-slate-100 first:border-t-0">
                    <Link to={caseLink(role, c.id)} className="group flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-50">
                      <Avatar name={c.student} seed={c.id} square />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-900 truncate">{c.student}</span>
                        <span className="block text-xs text-slate-500 truncate">
                          {c.caseId} · {isWarden ? statusLabel(c.status) : c.offense}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-500">{formatDate(c.date)}</span>
                      <Icon name="chevron_right" className="text-[20px] text-slate-400 group-hover:text-slate-600" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Case Distribution" icon="donut_large">
              <div className="px-6 pb-6 flex flex-col sm:flex-row xl:flex-col 2xl:flex-row items-center gap-6">
                {loading ? (
                  <div className="h-44 w-44 rounded-full bg-slate-100 animate-pulse" />
                ) : (
                  <Donut slices={distribution} total={stats.total} />
                )}
                <ul className="w-full divide-y divide-slate-100">
                  {distribution.map((slice) => (
                    <li key={slice.key} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="flex items-center gap-2.5 text-slate-700">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                        {slice.label}
                      </span>
                      <span className="font-semibold text-slate-900 tabular-nums">{loading ? '–' : fmtNumber(slice.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DACLayout>
  );
}
