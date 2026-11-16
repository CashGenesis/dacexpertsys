import { useEffect, useState } from 'react';
import DACLayout from '../../components/layout/DACLayout';
import { Card, EmptyState, PageHeader } from '../../components/cases/parts';
import { getPolicies } from '../../services/api';

const LEVELS = [
  { level: 1, label: 'Minor', points: 10, fine: '₹1,000', tone: 'bg-[#e3ebf7] text-[#3b5b8a]' },
  { level: 2, label: 'Moderate', points: 25, fine: '₹2,500', tone: 'bg-[#fbecd3] text-[#94600f]' },
  { level: 3, label: 'Serious', points: 50, fine: '₹5,000', tone: 'bg-[#fbe4d6] text-[#b4541a]' },
  { level: 4, label: 'Critical', points: 100, fine: '₹10,000', tone: 'bg-[#f6dde1] text-[#a1203a]' },
];

/** The official DAC policy, read from the policy documents in the database. */
export default function StudentPolicy() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getPolicies()
      .then(setPolicies)
      .catch((loadError) => setError(loadError?.message || 'Failed to load the policy.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DACLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader title="DAC Policy" subtitle="How the Disciplinary Action Committee classifies offences and assigns penalties." />

        <Card title="Offence levels" icon="stacked_bar_chart">
          <div className="px-6 pb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {LEVELS.map((l) => (
              <div key={l.level} className="rounded-xl border border-slate-200/80 p-4">
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${l.tone}`}>Level {l.level} · {l.label}</span>
                <p className="mt-3 text-2xl font-semibold text-slate-900 tabular-nums">{l.points} pts</p>
                <p className="text-sm text-slate-500">Fine {l.fine}</p>
              </div>
            ))}
          </div>
          <p className="px-6 pb-6 text-sm text-slate-600">Reaching 100 total penalty points escalates your record for DAC review.</p>
        </Card>

        {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{error}</p>}
        {loading && <div className="h-40 rounded-2xl bg-white border border-slate-200/80 animate-pulse" />}
        {!loading && !error && policies.length === 0 && (
          <Card>
            <EmptyState icon="policy">No policy documents found.</EmptyState>
          </Card>
        )}

        {policies.map((p) => (
          <Card key={p.id} title={p.metadata?.policy_name || p.id} icon="policy">
            <div className="px-6 pb-6">
              {p.metadata?.section && <p className="text-xs text-slate-500 mb-3">Section {p.metadata.section}</p>}
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{p.content}</p>
            </div>
          </Card>
        ))}
      </div>
    </DACLayout>
  );
}
