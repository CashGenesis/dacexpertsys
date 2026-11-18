import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DACLayout from '../components/layout/DACLayout';
import CasesTable from '../components/cases/CasesTable';
import { PageHeader } from '../components/cases/parts';
import { STAGE_FOR_ROLE } from '../components/cases/caseUi';
import { useAuth } from '../context/AuthContext';
import { usePagedCases } from '../hooks/usePagedCases';

const PAGE_COPY = {
  warden: { title: 'My Cases', subtitle: 'Cases you registered and their current stage.', query: { role: 'my_created_only' } },
  chief_warden: { title: 'Review Cases', subtitle: 'Cases waiting for your review and the wider caseload.', query: {} },
  student: { title: 'My Cases', subtitle: 'Your disciplinary cases and their status.', query: {} },
};

/** Searchable, filterable case list for wardens, chief wardens and students. */
export default function CaseList() {
  const { role } = useAuth();
  const copy = PAGE_COPY[role] || PAGE_COPY.warden;
  const myStage = STAGE_FOR_ROLE[role];
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [filter, setFilter] = useState(myStage ? 'mine' : 'all');
  // Filtering, search and paging run on the server; only the visible page is downloaded.
  const { rows, total, page, setPage, loading, error } = usePagedCases({
    query: copy.query,
    filter,
    search,
    pageSize: 10,
  });

  const tabs = [
    ...(myStage ? [{ key: 'mine', label: 'Awaiting You' }] : []),
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'severe', label: 'High & Critical' },
  ];

  return (
    <DACLayout searchValue={search} onSearchChange={setSearch}>
      <div className="max-w-[1400px] mx-auto space-y-6">
        <PageHeader title={copy.title} subtitle={copy.subtitle} />
        {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{error}</p>}
        <CasesTable
          cases={rows}
          total={total}
          page={page}
          onPageChange={setPage}
          loading={loading}
          role={role}
          title={search.trim() ? `Results for “${search.trim()}”` : 'Cases'}
          tabs={tabs}
          activeTab={filter}
          onTabChange={setFilter}
          pageSize={10}
          showStudent={role !== 'student'}
        />
      </div>
    </DACLayout>
  );
}
