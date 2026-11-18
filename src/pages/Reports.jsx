import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getCaseRecommendation } from '../services/api';
import DACLayout from '../components/layout/DACLayout';
import { Button, PageHeader } from '../components/cases/parts';

const REPORTS_PAGE_SIZE = 10;
import { pageVariants, listVariants, itemVariants } from '../lib/motion';
import { usePagedCases } from '../hooks/usePagedCases';

// ── Icons ───────────────────────────────────────────────────────────────────
const ScalesIcon = () => (
  <svg width="27" height="28.5" viewBox="0 0 27 28.5" fill="none">
    <line x1="13.5" y1="2" x2="13.5" y2="26.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <line x1="2" y1="8" x2="25" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M2 8 L6 18 Q2 18 6 18" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <path d="M2 18 Q4 13 6 18" stroke="white" strokeWidth="1.6" fill="rgba(255,255,255,0.2)" strokeLinecap="round" />
    <path d="M21 8 L25 18" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M21 18 Q23 13 25 18" stroke="white" strokeWidth="1.6" fill="rgba(255,255,255,0.2)" strokeLinecap="round" />
    <line x1="9" y1="26.5" x2="18" y2="26.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="6.5" stroke="white" strokeWidth="1.3" />
    <path d="M4.5 7.5l2 2 4-4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EditIcon = () => (
  <svg width="13.5" height="13.5" viewBox="0 0 14 14" fill="none">
    <path d="M1 13h12" stroke="#64748b" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M10.5 1.5l2 2-8 8H2.5v-2l8-8z" stroke="#64748b" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 1v7M3 5.5l3 3 3-3" stroke="#64748b" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1 10.5h10" stroke="#64748b" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const BackIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M7.5 1.5l-5 4.5 5 4.5" stroke="#64748b" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2.5 6h9" stroke="#64748b" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const GridIcon = () => (
  <svg width="20" height="18" viewBox="0 0 20 18" fill="none">
    <rect x="1" y="1" width="7" height="7" rx="1" stroke="#3d3793" strokeWidth="1.4" />
    <rect x="12" y="1" width="7" height="7" rx="1" stroke="#3d3793" strokeWidth="1.4" />
    <rect x="1" y="10" width="7" height="7" rx="1" stroke="#3d3793" strokeWidth="1.4" />
    <rect x="12" y="10" width="7" height="7" rx="1" stroke="#3d3793" strokeWidth="1.4" />
  </svg>
);

const WarningIcon = () => (
  <svg width="22" height="19" viewBox="0 0 22 19" fill="none">
    <path d="M11 1L1 17h20L11 1z" stroke="#f97316" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M11 8v4" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="11" cy="14.5" r="0.75" fill="#f97316" />
  </svg>
);

const ExclamationIcon = () => (
  <svg width="4" height="18" viewBox="0 0 4 18" fill="none">
    <path d="M2 1v11" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="2" cy="16" r="1.5" fill="#ef4444" />
  </svg>
);

const InfoCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="8.5" stroke="#3b82f6" strokeWidth="1.4" />
    <path d="M10 9v5" stroke="#3b82f6" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="10" cy="6.5" r="0.8" fill="#3b82f6" />
  </svg>
);

const UpTrendIcon = () => (
  <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
    <path d="M1 11L7 5L11 9L19 1" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="5" height="8" viewBox="0 0 5 8" fill="none">
    <path d="M1 1l3 3-3 3" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Severity Gauge ─────────────────────────────────────────────────────────
function SeverityGauge({ score = 85 }) {
  const r = 44;
  const circumference = Math.PI * r;
  const progress = (score / 100) * circumference;
  const color = score >= 71 ? '#ef4444' : score >= 41 ? '#f97316' : '#22c55e';

  return (
    <div className="flex flex-col items-center py-2">
      <svg width="100" height="60" viewBox="0 0 100 60">
        <path d={`M 6 52 A ${r} ${r} 0 0 1 94 52`} fill="none" stroke="#f1f5f9" strokeWidth="10" strokeLinecap="round" />
        <path d={`M 6 52 A ${r} ${r} 0 0 1 94 52`} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${progress} ${circumference}`} style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        <text x="50" y="46" textAnchor="middle" fontSize="20" fontWeight="700" fill="#0f172a" fontFamily="Inter, sans-serif">{score}</text>
      </svg>
      <p className="text-[#94a3b8] text-xs mt-1">out of 100</p>
    </div>
  );
}

function toTitleCase(value = '') {
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function toRisk(score) {
  if (score >= 85) return 'Critical';
  if (score >= 65) return 'High Risk';
  if (score >= 40) return 'Moderate';
  return 'Low';
}

const FACTOR_STYLES = {
  aggravating: { Icon: WarningIcon, bg: 'bg-orange-50', border: 'border-orange-100', label: 'Aggravating' },
  history: { Icon: ExclamationIcon, bg: 'bg-red-50', border: 'border-red-100', label: 'History' },
  evidence: { Icon: ExclamationIcon, bg: 'bg-red-50', border: 'border-red-100', label: 'Evidence' },
  mitigating: { Icon: InfoCircleIcon, bg: 'bg-blue-50', border: 'border-blue-100', label: 'Mitigating' },
  policy: { Icon: InfoCircleIcon, bg: 'bg-slate-50', border: 'border-slate-200', label: 'Policy' },
};

const RISK_COLORS = {
  Critical: { text: 'text-[#ef4444]', border: 'border-l-[#ef4444]' },
  High: { text: 'text-[#ef4444]', border: 'border-l-[#ef4444]' },
  Moderate: { text: 'text-[#f97316]', border: 'border-l-[#f97316]' },
  Low: { text: 'text-[#22c55e]', border: 'border-l-[#22c55e]' },
};

// ── Main Component ─────────────────────────────────────────────────────────
// API case row -> recommendation card. Student name and enrollment come with the case row.
function toRecommendation(entry) {
  const score = Number(entry.severity_score ?? entry.penalty_points ?? 0);
  const severity = toTitleCase(entry.severity);
  return {
    caseId: entry.id,
    id: `#${entry.id}`,
    studentName: entry.student_name || 'Unknown Student',
    studentId: entry.enrollment_no || `ID-${entry.student_id}`,
    offense: toTitleCase(entry.offense_type) || 'N/A',
    date: formatDate(entry.incident_date ?? entry.created_at),
    status: 'Awaiting Committee Decision',
    severity,
    score,
    risk: toRisk(score),
  };
}

// Only cases the DSW has forwarded for the final committee decision (status pending_admin).
// Earlier stages may still end with a warning, so a penalty recommendation is not useful there.
const FINAL_STAGE_QUERY = { status: 'pending_admin' };

export default function Reports() {
  const [selectedCase, setSelectedCase] = useState(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  // AI recommendation for the open case: { status: 'loading' | 'done' | 'error', data, error }.
  const [rec, setRec] = useState(null);
  const recCacheRef = useRef(new Map()); // caseId -> recommendation, so going back and forth is free
  const activeCaseRef = useRef(null);

  // Calls Groq only when a case is opened (or Regenerate is clicked).
  const loadRecommendation = useCallback(async (caseId, { force = false } = {}) => {
    activeCaseRef.current = caseId;
    const cached = recCacheRef.current.get(caseId);
    if (cached && !force) {
      setRec({ status: 'done', data: cached, error: '' });
      return;
    }
    setRec({ status: 'loading', data: null, error: '' });
    try {
      const data = await getCaseRecommendation(caseId);
      recCacheRef.current.set(caseId, data);
      if (activeCaseRef.current === caseId) setRec({ status: 'done', data, error: '' });
    } catch (recError) {
      if (activeCaseRef.current === caseId) {
        setRec({ status: 'error', data: null, error: recError?.message || 'Could not generate the recommendation.' });
      }
    }
  }, []);

  const openCase = (c) => {
    setSelectedCase(c);
    loadRecommendation(c.caseId);
  };

  const closeCase = () => {
    activeCaseRef.current = null;
    setSelectedCase(null);
    setRec(null);
  };
  // Search and paging run on the server; only the visible page is downloaded.
  const { rows: pageCases, total, page, setPage, loading, error } = usePagedCases({
    query: FINAL_STAGE_QUERY,
    search,
    pageSize: REPORTS_PAGE_SIZE,
    map: toRecommendation,
  });

  const renderDetailView = () => (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="max-w-[1152px] mx-auto"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-[#94a3b8] mb-3">
            <button onClick={closeCase} className="hover:text-[#3d3793] transition-colors">Cases</button>
            <ChevronRightIcon />
            <span className="text-[#3d3793] font-medium">Case {selectedCase.id}</span>
            <ChevronRightIcon />
            <span className="text-[#3d3793] font-medium">Recommendation</span>
          </div>
          <h1 className="text-[#0f172a] text-[32px] font-bold leading-9 mb-2">
            Recommendation Result
          </h1>
          <p className="text-[#64748b] text-lg leading-7">
            Case {selectedCase.id} - {selectedCase.studentName} (Student ID: {selectedCase.studentId})
          </p>
        </div>

        <div className="flex gap-3 mt-2 shrink-0">
          <button onClick={closeCase} className="flex items-center gap-2 border border-[#e2e8f0] bg-white text-[#64748b] text-sm font-medium px-4 py-2.5 rounded-lg hover:border-[#3d3793] hover:text-[#3d3793] transition-colors shadow-sm">
            <BackIcon /> Back to Cases
          </button>
          <button
            onClick={() => window.print()}
            disabled={rec?.status !== 'done'}
            className="flex items-center gap-2 border border-[#e2e8f0] bg-white text-[#64748b] text-sm font-medium px-4 py-2.5 rounded-lg hover:border-[#3d3793] hover:text-[#3d3793] transition-colors shadow-sm disabled:opacity-50"
          >
            <DownloadIcon /> Download Report
          </button>
        </div>
      </div>

      {rec?.status === 'loading' && (
        <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm p-5 sm:p-8">
          <div className="flex items-center gap-3 text-[#3d3793]">
            <span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span>
            <p className="text-sm font-medium">Analysing the case, the student&apos;s history and the DAC policy…</p>
          </div>
          <div className="mt-6 space-y-3">
            <div className="h-5 w-2/3 rounded bg-slate-100 animate-pulse" />
            <div className="h-4 w-full rounded bg-slate-100 animate-pulse" />
            <div className="h-4 w-5/6 rounded bg-slate-100 animate-pulse" />
          </div>
        </div>
      )}

      {rec?.status === 'error' && (
        <div className="bg-white border border-red-200 rounded-xl shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-red-700">{rec.error}</p>
          <button
            onClick={() => loadRecommendation(selectedCase.caseId, { force: true })}
            className="shrink-0 border border-red-200 text-red-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-50"
          >
            Try again
          </button>
        </div>
      )}

      {rec?.status === 'done' && (() => {
        const r = rec.data;
        const risk = RISK_COLORS[r.risk_level] || RISK_COLORS.Moderate;
        return (
      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col lg:flex-row gap-8 items-start"
      >
        <motion.div variants={itemVariants} className="flex-1 min-w-0 flex flex-col gap-6">

          <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden">
            <div className="h-2 bg-[#3d3793] w-full" />
            <div className="p-5 sm:p-8 flex flex-col sm:flex-row gap-4 sm:gap-6">
              <div className="w-[59px] h-[60px] rounded-xl bg-[#3d3793] flex items-center justify-center shrink-0">
                <ScalesIcon />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#94a3b8] mb-2">AI recommendation</p>
                <h2 className="text-[#0f172a] text-xl sm:text-2xl font-bold leading-7 sm:leading-8 mb-4 break-words">
                  {r.recommended_action}
                </h2>
                <p className="text-[#64748b] text-sm leading-6 mb-5 max-w-[611px]">{r.summary}</p>
                {r.additional_measures.length > 0 && (
                  <ul className="mb-5 space-y-1">
                    {r.additional_measures.map((m) => (
                      <li key={m} className="text-sm text-[#334155] flex gap-2"><span className="text-[#94a3b8]">•</span>{m}</li>
                    ))}
                  </ul>
                )}
                {r.threshold_warning && (
                  <p className="mb-5 text-sm text-[#b45309] bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{r.threshold_warning}</p>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate(`/cases/${selectedCase.caseId}`)}
                    className="flex items-center gap-2 bg-[#3d3793] text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-[#162d6b] transition-colors shadow-sm"
                  >
                    <CheckCircleIcon /> Open Case to Decide
                  </button>
                  <button
                    onClick={() => loadRecommendation(selectedCase.caseId, { force: true })}
                    className="flex items-center gap-2 border border-[#e2e8f0] text-[#64748b] text-sm font-medium px-5 py-2.5 rounded-lg hover:border-[#3d3793] hover:text-[#3d3793] transition-colors"
                  >
                    <EditIcon /> Regenerate
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm p-5 sm:p-8">
            <h3 className="text-[#0f172a] text-lg font-bold flex items-center gap-3 mb-6">
              <GridIcon />
              Contributing Factors
            </h3>
            {r.factors.length === 0 ? (
              <p className="text-sm text-[#64748b]">No specific factors were given.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {r.factors.map((f, index) => {
                  const style = FACTOR_STYLES[f.type] || FACTOR_STYLES.policy;
                  const Icon = style.Icon;
                  return (
                    <div key={`${f.title}-${index}`} className={`flex gap-4 p-4 rounded-xl border ${style.bg} ${style.border}`}>
                      <div className="w-[22px] shrink-0 flex items-start justify-center pt-0.5">
                        <Icon />
                      </div>
                      <div>
                        <p className="text-[#0f172a] text-sm font-semibold mb-1">
                          {f.title} <span className="ml-1 text-xs font-medium text-[#94a3b8]">{style.label}</span>
                        </p>
                        <p className="text-[#64748b] text-sm leading-5">{f.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {r.policy_references.length > 0 && (
            <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm p-5 sm:p-8">
              <h3 className="text-[#0f172a] text-lg font-bold mb-4">Policy References</h3>
              <ul className="space-y-2">
                {r.policy_references.map((ref) => (
                  <li key={ref} className="text-sm text-[#475569] border-l-2 border-[#3d3793]/40 pl-3">{ref}</li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="w-full lg:w-[368px] lg:shrink-0 flex flex-col gap-4">

          <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm px-6 py-5">
            <p className="text-[#64748b] text-xs font-semibold uppercase tracking-widest text-center mb-1">
              Severity Score
            </p>
            <SeverityGauge score={r.severity_score} />
          </div>

          {/* Risk Level */}
          <div className={`bg-white border-y border-r border-l-4 ${risk.border} rounded-xl shadow-sm px-6 py-5 border-y-[#e2e8f0] border-r-[#e2e8f0]`}>
            <p className="text-[#94a3b8] text-xs font-semibold uppercase tracking-widest mb-2">
              Risk Level
            </p>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-2xl font-bold leading-none ${risk.text}`}>{r.risk_level}</span>
              {(r.risk_level === 'High' || r.risk_level === 'Critical') && <UpTrendIcon />}
            </div>
            <p className="text-[#94a3b8] text-xs">Confidence: {r.confidence}</p>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm px-6 py-5 space-y-3">
            <p className="text-[#94a3b8] text-xs font-semibold uppercase tracking-widest">Penalty</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-bold text-[#0f172a] tabular-nums">{r.penalty_points}</p>
                <p className="text-xs text-[#64748b]">points{r.dac_level ? ` · Level ${r.dac_level}` : ''}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#0f172a] tabular-nums">₹{Number(r.fine).toLocaleString('en-IN')}</p>
                <p className="text-xs text-[#64748b]">fine</p>
              </div>
            </div>
            <p className="text-xs text-[#64748b] border-t border-[#f1f5f9] pt-3">
              Earlier cases: {r.prior_cases} · points already awarded: {r.prior_points} · after this case: {r.points_after_case}
            </p>
          </div>

          {r.missing_information.length > 0 && (
            <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm px-6 py-5">
              <p className="text-[#94a3b8] text-xs font-semibold uppercase tracking-widest mb-2">Missing information</p>
              <ul className="space-y-1">
                {r.missing_information.map((m) => <li key={m} className="text-sm text-[#475569]">• {m}</li>)}
              </ul>
            </div>
          )}

          <p className="text-[11px] text-[#94a3b8] leading-relaxed px-1">
            Generated by AI ({r.model}) from the case, the student&apos;s history, the DAC &amp; Unfair Means policies
            and the admin rules. Advisory only: the Committee makes the final decision.
          </p>
        </motion.div>
      </motion.div>
        );
      })()}
    </motion.div>
  );

  const renderListView = () => (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="max-w-[1152px] mx-auto"
    >
      <div className="mb-6">
        <PageHeader title="AI Case Recommendations" subtitle="Cases forwarded by the DSW for the committee's final decision. Select one to get an AI penalty recommendation." />
      </div>

      <div className="relative mb-5 max-w-md">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] text-[20px]">search</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by student name, enrollment no., case ID or offence"
          aria-label="Search cases"
          className="w-full rounded-lg border border-[#e2e8f0] bg-white pl-10 pr-3 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#3d3793] focus:ring-1 focus:ring-[#3d3793]"
        />
      </div>
      {!loading && !error && pageCases.length === 0 && (
        <p className="text-sm text-[#64748b] mb-4">
          {search.trim() ? <>No cases match &ldquo;{search.trim()}&rdquo;.</> : 'No cases are waiting for the committee decision.'}
        </p>
      )}

      {loading && <p className="text-[#64748b] text-sm mb-4">Loading...</p>}
      {!!error && <p className="text-sm text-red-600 mb-4">Error: {error}</p>}

      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-4"
      >
        {pageCases.map((c) => (
          <motion.div
            key={c.id}
            variants={itemVariants}
            onClick={() => openCase(c)}
            className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer hover:border-[#3d3793] hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-full bg-[#f1f5f9] flex items-center justify-center text-lg font-bold text-[#64748b]">
                {c.studentName.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0f172a] group-hover:text-[#3d3793] transition-colors">{c.id} - {c.studentName}</h3>
                <p className="text-[#64748b] text-sm">
                  <span className="font-medium text-[#475569]">{c.offense}</span> • ID: {c.studentId} • {c.date}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-[#94a3b8] text-xs font-semibold uppercase tracking-widest mb-1">Status</p>
                <p className="text-[#f97316] text-sm font-medium flex items-center gap-1.5 justify-end">
                  <span className="w-2 h-2 rounded-full bg-[#f97316]" />
                  {c.status}
                </p>
              </div>
              <button className="hidden sm:flex border border-[#e2e8f0] bg-white text-[#3d3793] text-sm font-medium px-4 py-2 rounded-lg group-hover:bg-[#3d3793] group-hover:text-white transition-colors">
                View Recommendation
              </button>
              <span className="text-[#94a3b8] group-hover:text-[#3d3793] transition-colors">
                <ChevronRightIcon />
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Render one page at a time: thousands of animated rows freeze the browser. */}
      <div className="flex items-center justify-between mt-6 text-sm text-slate-500">
        <span className="tabular-nums">
          {total ? page * REPORTS_PAGE_SIZE + 1 : 0}–{Math.min((page + 1) * REPORTS_PAGE_SIZE, total)} of{' '}
          {total.toLocaleString('en-IN')} cases
        </span>
        <div className="flex gap-2">
          <Button variant="outline" disabled={page === 0} onClick={() => setPage(Math.max(0, page - 1))}>
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={(page + 1) * REPORTS_PAGE_SIZE >= total}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <DACLayout searchValue={search} onSearchChange={setSearch}>
      <div className="font-inter">
        <AnimatePresence mode="wait">
          {selectedCase ? (
            <motion.div key="detail" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              {renderDetailView()}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              {renderListView()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DACLayout>
  );
}