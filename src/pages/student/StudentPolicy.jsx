import { useEffect, useState } from 'react';
import DACLayout from '../../components/layout/DACLayout';
import { Card, PageHeader } from '../../components/cases/parts';
import { getDacPolicy } from '../../services/api';

const LEVEL_TONES = {
  1: 'bg-[#e3ebf7] text-[#3b5b8a]',
  2: 'bg-[#fbecd3] text-[#94600f]',
  3: 'bg-[#fbe4d6] text-[#b4541a]',
  4: 'bg-[#f6dde1] text-[#a1203a]',
};

const TABS = [
  { key: 'dac', label: 'Disciplinary Action Policy' },
  { key: 'ufm', label: 'Unfair Means (Exams)' },
];

const formatRupees = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

const formatDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
  day: 'numeric', month: 'long', year: 'numeric',
});

function DocMeta({ policy }) {
  return (
    <p className="text-xs text-slate-500">
      {policy.reference} · dated {formatDate(policy.date)}
      {policy.version ? ` · Version ${policy.version}` : ''}
    </p>
  );
}

function NumberedList({ items }) {
  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={item} className="flex gap-3 text-sm text-slate-700 leading-relaxed">
          <span className="shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center tabular-nums">
            {index + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function DacPolicySection({ dac }) {
  return (
    <>
      <Card title="Offence levels and penalties" icon="stacked_bar_chart">
        <div className="px-6 pb-6 space-y-4">
          <DocMeta policy={dac} />
          <p className="text-sm text-slate-600 leading-relaxed">{dac.intro}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dac.levels.map((level) => (
              <div key={level.level} className="rounded-xl border border-slate-200/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${LEVEL_TONES[level.level]}`}>
                    Level {level.level}
                  </span>
                  <span className="text-xs text-slate-500">Fine {formatRupees(level.fine)}</span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-slate-900 tabular-nums">{level.points} pts</p>
                <ul className="mt-3 space-y-1.5">
                  {level.offences.map((offence) => (
                    <li key={offence} className="text-sm text-slate-700 flex gap-2">
                      <span className="text-slate-400">•</span>
                      <span>{offence}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Penalty point limits" icon="report">
        <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {dac.thresholds.map((t) => (
            <div key={t.points} className="rounded-xl border border-rose-100 bg-rose-50/60 p-4">
              <p className="text-2xl font-semibold text-rose-700 tabular-nums">{t.points} pts</p>
              <p className="mt-1 text-sm text-slate-700">{t.consequence}</p>
            </div>
          ))}
          <p className="sm:col-span-2 text-sm text-slate-600">
            Paying the fine does not cancel penalty points. The fine is over and above the points levied.
          </p>
        </div>
      </Card>

      <Card title="Rules" icon="gavel">
        <div className="px-6 pb-6">
          <NumberedList items={dac.rules} />
        </div>
      </Card>

      <Card title="Committees" icon="groups">
        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'dac', name: 'Disciplinary Action Committee', data: dac.committees.dac },
            { key: 'appellate', name: 'Appellate Committee', data: dac.committees.appellate },
          ].map(({ key, name, data }) => (
            <div key={key} className="rounded-xl border border-slate-200/80 p-4">
              <p className="text-sm font-semibold text-slate-900">{name}</p>
              <p className="text-xs text-slate-500 mt-0.5">Nominated by the {data.nominatedBy} · Quorum {data.quorum}</p>
              <ul className="mt-3 space-y-1.5">
                {data.members.map((member) => (
                  <li key={member} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-slate-400">•</span>
                    <span>{member}</span>
                  </li>
                ))}
              </ul>
              {data.note ? <p className="mt-3 text-xs text-slate-500">{data.note}</p> : null}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function UnfairMeansSection({ ufm }) {
  return (
    <>
      <Card title="Examination offences and punishments" icon="assignment_late">
        <div className="px-6 pb-6 space-y-4">
          <DocMeta policy={ufm} />
          <p className="text-sm text-slate-600 leading-relaxed">{ufm.intro}</p>
          <div className="space-y-3">
            {ufm.categories.map((c) => (
              <div key={c.category} className="rounded-xl border border-slate-200/80 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    Category {c.category}
                  </span>
                  {c.dacLevel ? (
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f6dde1] text-[#a1203a]">
                      DAC Level {c.dacLevel}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm font-medium text-slate-900">{c.punishment}</p>
                <ul className="mt-3 space-y-1.5">
                  {c.offences.map((offence) => (
                    <li key={offence} className="text-sm text-slate-700 flex gap-2">
                      <span className="text-slate-400">•</span>
                      <span>{offence}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card title="Also note" icon="info">
        <div className="px-6 pb-6">
          <NumberedList items={ufm.additional} />
        </div>
      </Card>
    </>
  );
}

/** The official DAC and Unfair Means policies, as issued in the signed university PDFs. */
export default function StudentPolicy() {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('dac');

  useEffect(() => {
    getDacPolicy()
      .then(setPolicy)
      .catch((loadError) => setError(loadError?.message || 'Failed to load the policy.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DACLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader title="DAC Policy" subtitle="How the Disciplinary Action Committee classifies offences and assigns penalties." />

        <div role="tablist" className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-white text-[#3d3793] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{error}</p>}
        {loading && <div className="h-40 rounded-2xl bg-white border border-slate-200/80 animate-pulse" />}

        {policy && tab === 'dac' && <DacPolicySection dac={policy.dac} />}
        {policy && tab === 'ufm' && <UnfairMeansSection ufm={policy.unfairMeans} />}
      </div>
    </DACLayout>
  );
}
