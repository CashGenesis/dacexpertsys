/**
 * SystemConfig.jsx
 * Admin Settings → Rules & Policies (route /admin-settings/rules-weights)
 * Shows the official DAC Policy (Version 02) and Unfair Means Policy, served by the backend
 * from backend/config/dacPolicy.js (transcribed from the signed university PDFs).
 */

import { useEffect, useState } from 'react';
import { getDacPolicy } from '../../services/api';

const LEVEL_STYLES = {
  1: { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
  2: { color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  3: { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  4: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
};

const formatDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
  day: 'numeric', month: 'long', year: 'numeric',
});

function SectionCard({ icon, title, subtitle, children }) {
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#e2e8f0]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#3d3793] text-[18px]">{icon}</span>
          <h4 className="font-semibold text-[#0f172a] text-sm">{title}</h4>
        </div>
        {subtitle ? <p className="text-xs text-[#64748b] mt-1">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

export default function SystemConfig() {
  const [policy, setPolicy] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDacPolicy()
      .then(setPolicy)
      .catch((loadError) => setError(loadError?.message || 'Failed to load the policy.'));
  }, []);

  const dac = policy?.dac;
  const ufm = policy?.unfairMeans;

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-[#0f172a]">Rules &amp; Policies</h3>
        <p className="text-sm text-[#64748b] mt-0.5">
          Official penalty policy used for DAC decisions.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {!policy && !error && (
        <div className="h-40 rounded-xl bg-white border border-[#e2e8f0] animate-pulse" />
      )}

      {dac && (
        <>
          {/* ── DAC Penalty Policy ─────────────────────────────────────────── */}
          <SectionCard
            icon="policy"
            title="DAC Penalty Policy"
            subtitle={`${dac.title} (Version ${dac.version}) · ${dac.reference} · dated ${formatDate(dac.date)}`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-[#e2e8f0]">
                    {['Level', 'Nature of Offence', 'Fine (Rs.)', 'Penalty Points'].map((h) => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {dac.levels.map(({ level, fine, points, offences }) => {
                    const style = LEVEL_STYLES[level];
                    return (
                      <tr key={level} className="align-top hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${style.color} ${style.bg} ${style.border}`}>
                            Level {level}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-[#0f172a]">
                          <ul className="space-y-1">
                            {offences.map((offence) => <li key={offence}>{offence}</li>)}
                          </ul>
                        </td>
                        <td className="px-5 py-4 text-sm font-mono font-medium text-[#0f172a] whitespace-nowrap">
                          {fine.toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-[#0f172a]">{points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* ── Accumulated points ────────────────────────────────────────── */}
          <SectionCard icon="bar_chart" title="Accumulated Penalty Points">
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dac.thresholds.map((t) => (
                <div key={t.points} className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-bold text-red-700">{t.points} points</p>
                  <p className="text-xs text-[#475569] mt-0.5">{t.consequence}</p>
                </div>
              ))}
              <p className="sm:col-span-2 text-xs text-[#64748b]">
                Paying the fine does not cancel penalty points. Repeat offenders may be punished to a greater extent.
              </p>
            </div>
          </SectionCard>

          {/* ── Rules ─────────────────────────────────────────────────────── */}
          <SectionCard icon="gavel" title="Policy Rules">
            <ol className="p-5 space-y-2.5 list-decimal list-outside pl-10">
              {dac.rules.map((rule) => (
                <li key={rule} className="text-sm text-[#334155] leading-relaxed">{rule}</li>
              ))}
            </ol>
          </SectionCard>
        </>
      )}

      {ufm && (
        <SectionCard
          icon="assignment_late"
          title="Unfair Means in Examinations"
          subtitle={`${ufm.title} · ${ufm.reference} · dated ${formatDate(ufm.date)}`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-[#e2e8f0]">
                  {['Category', 'DAC Level', 'Punishment'].map((h) => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold text-[#64748b] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {ufm.categories.map((c) => (
                  <tr key={c.category} className="align-top">
                    <td className="px-5 py-4 text-sm font-semibold text-[#0f172a] whitespace-nowrap">Category {c.category}</td>
                    <td className="px-5 py-4 text-sm text-[#0f172a] whitespace-nowrap">{c.dacLevel ? `Level ${c.dacLevel}` : '—'}</td>
                    <td className="px-5 py-4 text-sm text-[#334155]">{c.punishment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

    </div>
  );
}
