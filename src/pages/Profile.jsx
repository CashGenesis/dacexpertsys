import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DACLayout from '../components/layout/DACLayout';
import { Avatar, Card, Icon, PageHeader } from '../components/cases/parts';
import { fmtNumber, toTitleCase } from '../components/cases/caseUi';
import { useAuth } from '../context/AuthContext';
import { getMe } from '../services/api';

const ROLE_NAMES = {
  student: 'Student',
  warden: 'Hostel Warden',
  chief_warden: 'Chief Warden',
  dsw: 'Dean of Student Welfare',
  admin: 'Administrator',
};

function Row({ icon, label, value }) {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <span className="h-9 w-9 shrink-0 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
        <Icon name={icon} className="text-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm text-slate-900 truncate">{value || '—'}</p>
      </div>
    </div>
  );
}

/** The signed-in user's own details, read from the database. */
export default function Profile() {
  const { currentUser, role } = useAuth();
  const [user, setUser] = useState(currentUser);
  const [error, setError] = useState('');

  useEffect(() => {
    getMe().then(setUser).catch((loadError) => setError(loadError?.message || 'Failed to load profile.'));
  }, []);

  const isStudent = role === 'student';
  const rows = [
    { icon: 'badge', label: 'Role', value: ROLE_NAMES[role] || toTitleCase(role) },
    { icon: 'mail', label: 'Email', value: user?.email },
    ...(isStudent
      ? [
          { icon: 'tag', label: 'Enrollment number', value: user?.enrollment_no },
          { icon: 'school', label: 'Program', value: user?.program ? String(user.program).toUpperCase() : null },
          { icon: 'calendar_month', label: 'Year of study', value: user?.year ? `Year ${user.year}` : null },
          { icon: 'apartment', label: 'Hostel & room', value: [user?.hostel, user?.room].filter(Boolean).join(' · ') },
          { icon: 'family_restroom', label: 'Parent email', value: user?.parent_email },
        ]
      : [
          ...(user?.hostel ? [{ icon: 'apartment', label: 'Hostel', value: user.hostel }] : []),
        ]),
  ];

  return (
    <DACLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="Profile"
          subtitle="Your account details."
          action={
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700"
            >
              <Icon name="lock" className="text-[18px]" />
              Change password
            </Link>
          }
        />
        {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{error}</p>}

        <Card className="px-6 py-6">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={user?.name || ''} seed={user?.id || 0} square size="h-14 w-14" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-slate-900">{user?.name}</p>
              <p className="text-sm text-slate-500">{ROLE_NAMES[role]}</p>
            </div>
            {isStudent && (
              <div className="rounded-xl bg-[#f8e7ea] border border-[#efd2d8] px-5 py-3 text-right">
                <p className="text-xs font-medium text-[#9f1d35]">Penalty points</p>
                <p className="text-2xl font-semibold text-slate-900 tabular-nums">{fmtNumber(user?.total_points)}</p>
              </div>
            )}
          </div>
        </Card>

        <Card title="Details" icon="person">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 divide-slate-100 border-t border-slate-100">
            {rows.map((row) => (
              <Row key={row.label} {...row} />
            ))}
          </div>
        </Card>
      </div>
    </DACLayout>
  );
}
