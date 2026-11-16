import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DACLayout from '../components/layout/DACLayout';
import { Avatar, Button, Card, EmptyState, Icon, SeverityPill, StatusText } from '../components/cases/parts';
import { formatDate, formatDateTime, fmtNumber, toTitleCase } from '../components/cases/caseUi';
import { useAuth } from '../context/AuthContext';
import { approveCase, getCaseById, getCaseTimeline, updateCase } from '../services/api';

const STEPS = [
  { key: 'registered', label: 'Registered', role: 'Warden' },
  { key: 'pending_chief', label: 'Chief Warden', role: 'First review' },
  { key: 'pending_dsw', label: 'DSW', role: 'Second review' },
  { key: 'pending_admin', label: 'Admin', role: 'Final decision' },
  { key: 'resolved', label: 'Resolved', role: 'Closed' },
];

const LIST_LINKS = {
  warden: { to: '/warden/cases', label: 'My Cases' },
  chief_warden: { to: '/chief-warden/cases', label: 'Review Cases' },
  student: { to: '/student/cases', label: 'My Cases' },
  dsw: { to: '/dashboard', label: 'Case Roster' },
  admin: { to: '/dashboard', label: 'Dashboard' },
};

const ROLE_NAMES = { warden: 'Warden', chief_warden: 'Chief Warden', dsw: 'DSW', admin: 'Admin' };

const FORWARD_LABELS = {
  chief_warden: { button: 'Approve & forward to DSW', done: 'Case forwarded to the DSW.' },
  dsw: { button: 'Approve & forward to Admin', done: 'Case forwarded to the Admin for a final decision.' },
};

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{children || '—'}</dd>
    </div>
  );
}

function Stepper({ status }) {
  const current = status === 'resolved' ? STEPS.length : STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="grid grid-cols-5 gap-2">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step.key} className="flex flex-col items-center text-center">
            <div className="flex items-center w-full">
              <span className={`flex-1 h-0.5 ${i === 0 ? 'invisible' : done || active ? 'bg-[#3d3793]' : 'bg-slate-200'}`} />
              <span
                className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold ${
                  done ? 'bg-[#3d3793] text-white' : active ? 'bg-white border-2 border-[#3d3793] text-[#3d3793]' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {done ? <Icon name="check" className="text-[18px]" /> : i + 1}
              </span>
              <span className={`flex-1 h-0.5 ${i === STEPS.length - 1 ? 'invisible' : done ? 'bg-[#3d3793]' : 'bg-slate-200'}`} />
            </div>
            <p className={`mt-2 text-xs font-medium ${active ? 'text-[#3d3793]' : 'text-slate-700'}`}>{step.label}</p>
            <p className="text-[11px] text-slate-400">{step.role}</p>
          </li>
        );
      })}
    </ol>
  );
}

function AdminDecision({ caseItem, busy, onSubmit }) {
  const [points, setPoints] = useState(caseItem.penalty_points ?? 0);
  const [fine, setFine] = useState(Number(caseItem.fine ?? 0));
  const [decision, setDecision] = useState('');
  const input = 'w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#3d3793] focus:ring-4 focus:ring-indigo-100';

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ penalty_points: Number(points), fine: Number(fine), decision: decision.trim() });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-slate-500">
          Penalty points
          <input type="number" min="0" value={points} onChange={(e) => setPoints(e.target.value)} className={`${input} mt-1`} />
        </label>
        <label className="text-xs text-slate-500">
          Fine (₹)
          <input type="number" min="0" value={fine} onChange={(e) => setFine(e.target.value)} className={`${input} mt-1`} />
        </label>
      </div>
      <label className="block text-xs text-slate-500">
        Decision
        <textarea
          required
          rows={3}
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          placeholder="e.g. 25 penalty points and ₹2,500 fine with counselling."
          className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#3d3793] focus:ring-4 focus:ring-indigo-100"
        />
      </label>
      <Button type="submit" className="w-full" disabled={busy || !decision.trim()}>
        <Icon name="gavel" className="text-[18px]" />
        Resolve case
      </Button>
    </form>
  );
}

/**
 * One case page for every role. The workflow action is shown only to the role
 * the case is currently assigned to (Chief Warden -> DSW -> Admin).
 */
export default function CaseDetail() {
  const params = useParams();
  const caseId = params.id || params.token;
  const { role } = useAuth();
  const [caseItem, setCaseItem] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    try {
      const [item, events] = await Promise.all([getCaseById(caseId), getCaseTimeline(caseId).catch(() => [])]);
      setCaseItem(item);
      setTimeline(events);
      setError('');
    } catch (loadError) {
      setError(loadError?.message || 'Case not found.');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (action, successMessage) => {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      await load();
      setNotice({ type: 'success', text: successMessage });
    } catch (actionError) {
      setNotice({ type: 'error', text: actionError?.message || 'Action failed.' });
    } finally {
      setBusy(false);
    }
  };

  const back = LIST_LINKS[role] || LIST_LINKS.admin;
  const status = String(caseItem?.status || '').toLowerCase();
  const assigned = String(caseItem?.assigned_to_role || '').toLowerCase();
  const canAct = Boolean(caseItem) && status !== 'resolved' && assigned === role;

  return (
    <DACLayout>
      <div className="max-w-[1400px] mx-auto space-y-6">
        <Link to={back.to} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <Icon name="arrow_back" className="text-[18px]" />
          {back.label}
        </Link>

        {loading && <div className="h-40 rounded-2xl bg-white border border-slate-200/80 animate-pulse" />}

        {!loading && error && (
          <Card>
            <EmptyState icon="search_off">{error}</EmptyState>
          </Card>
        )}

        {!loading && caseItem && (
          <>
            {/* Header */}
            <Card className="px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500">Case</p>
                  <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                    {caseItem.external_case_id || `#${caseItem.id}`}
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    {toTitleCase(caseItem.offense_type)}
                    {caseItem.substance_type ? ` · ${caseItem.substance_type}` : ''} · Reported {formatDate(caseItem.incident_date || caseItem.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <SeverityPill severity={caseItem.severity} />
                  <span className="px-3 py-1 rounded-full bg-slate-100">
                    <StatusText status={status} />
                  </span>
                </div>
              </div>
              <div className="mt-6">
                <Stepper status={status} />
              </div>
            </Card>

            {notice && (
              <p
                role="status"
                className={`text-sm rounded-xl px-4 py-3 border ${
                  notice.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-700'
                }`}
              >
                {notice.text}
              </p>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <div className="xl:col-span-8 space-y-6">
                <Card title="Incident Details" icon="report">
                  <dl className="px-6 pb-6 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
                    <Field label="Offence">{toTitleCase(caseItem.offense_type)}</Field>
                    <Field label="Substance">{caseItem.substance_type}</Field>
                    <Field label="Offence level">{caseItem.offense_level ? `Level ${caseItem.offense_level}` : null}</Field>
                    <Field label="Incident date">{formatDate(caseItem.incident_date)}</Field>
                    <Field label="Incident time">{caseItem.incident_time ? String(caseItem.incident_time).slice(0, 5) : null}</Field>
                    <Field label="Location">{caseItem.incident_location || caseItem.location}</Field>
                    {caseItem.alcohol_reading != null && <Field label="Alcohol reading">{caseItem.alcohol_reading}</Field>}
                    <Field label="Penalty points">{fmtNumber(caseItem.penalty_points)}</Field>
                    <Field label="Fine">₹{fmtNumber(caseItem.fine)}</Field>
                  </dl>
                  <div className="px-6 pb-6 border-t border-slate-100 pt-5 space-y-4">
                    <div>
                      <p className="text-xs text-slate-500">Description</p>
                      <p className="mt-1 text-sm text-slate-800 leading-relaxed">{caseItem.description || '—'}</p>
                    </div>
                    {caseItem.decision && (
                      <div>
                        <p className="text-xs text-slate-500">Decision</p>
                        <p className="mt-1 text-sm text-slate-800 leading-relaxed">{caseItem.decision}</p>
                      </div>
                    )}
                    {caseItem.evidence_url && (
                      <a
                        href={caseItem.evidence_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#3d3793] hover:underline"
                      >
                        <Icon name="attach_file" className="text-[18px]" />
                        View evidence
                      </a>
                    )}
                  </div>
                </Card>

                <Card title="Timeline" icon="history">
                  {timeline.length === 0 ? (
                    <EmptyState icon="history">No timeline entries yet.</EmptyState>
                  ) : (
                    <ol className="px-6 pb-6">
                      {timeline.map((event, i) => (
                        <li key={event.id} className="relative flex gap-4 pb-5 last:pb-0">
                          {i < timeline.length - 1 && <span className="absolute left-[7px] top-4 bottom-0 w-px bg-slate-200" />}
                          <span className="relative mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-[#3d3793] bg-white" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">{event.event}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {[event.performed_by_name, ROLE_NAMES[event.performed_by_role] || toTitleCase(event.performed_by_role)]
                                .filter(Boolean)
                                .join(' · ') || 'System'}{' '}
                              · {formatDateTime(event.timestamp)}
                            </p>
                            {event.notes && <p className="text-xs text-slate-600 mt-1">{event.notes}</p>}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>
              </div>

              <div className="xl:col-span-4 space-y-6">
                <Card title="Student" icon="person">
                  <div className="px-6 pb-6">
                    <div className="flex items-center gap-3">
                      <Avatar name={caseItem.student_name || ''} seed={caseItem.id} square size="h-11 w-11" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{caseItem.student_name}</p>
                        <p className="text-xs text-slate-500">{caseItem.enrollment_no}</p>
                      </div>
                    </div>
                    <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
                      <Field label="Program">{caseItem.program ? String(caseItem.program).toUpperCase() : null}</Field>
                      <Field label="Gender">{toTitleCase(caseItem.gender)}</Field>
                      <Field label="Hostel">{caseItem.hostel}</Field>
                      <Field label="Room">{caseItem.room}</Field>
                    </dl>
                  </div>
                </Card>

                <Card title="Workflow" icon="account_tree">
                  <div className="px-6 pb-6 space-y-4">
                    {status === 'resolved' && (
                      <p className="text-sm text-slate-600">
                        Resolved{caseItem.resolved_at ? ` on ${formatDate(caseItem.resolved_at)}` : ''}. No further action needed.
                      </p>
                    )}

                    {status !== 'resolved' && !canAct && (
                      <p className="text-sm text-slate-600">
                        Waiting on the <span className="font-medium">{ROLE_NAMES[assigned] || 'next reviewer'}</span>.
                        {role === 'warden' && ' Registering the case already sent it to the Chief Warden.'}
                      </p>
                    )}

                    {canAct && FORWARD_LABELS[role] && (
                      <>
                        <p className="text-sm text-slate-600">This case is waiting on your review.</p>
                        <Button
                          className="w-full"
                          disabled={busy}
                          onClick={() => runAction(() => approveCase(caseItem.id), FORWARD_LABELS[role].done)}
                        >
                          <Icon name="send" className="text-[18px]" />
                          {FORWARD_LABELS[role].button}
                        </Button>
                      </>
                    )}

                    {canAct && role === 'admin' && (
                      <>
                        <p className="text-sm text-slate-600">Record the final decision to close this case.</p>
                        <AdminDecision
                          caseItem={caseItem}
                          busy={busy}
                          onSubmit={(values) =>
                            runAction(async () => {
                              await updateCase(caseItem.id, values);
                              await approveCase(caseItem.id);
                            }, 'Case resolved and the decision recorded.')
                          }
                        />
                      </>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </DACLayout>
  );
}
