import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DACLayout from '../components/layout/DACLayout';
import { Icon, PageHeader } from '../components/cases/parts';
import { toTitleCase } from '../components/cases/caseUi';
import { useAuth } from '../context/AuthContext';
import { getMe } from '../services/api';

const ROLE_NAMES = {
  student: 'Student',
  warden: 'Hostel Warden',
  chief_warden: 'Chief Warden',
  dsw: 'Dean of Student Welfare',
  admin: 'Administrator',
};

// Icon shown in the role tag under the name.
const ROLE_ICONS = {
  student: 'school',
  warden: 'badge',
  chief_warden: 'shield_person',
  dsw: 'account_balance',
  admin: 'admin_panel_settings',
};

// Opens Gmail's compose window addressed to the DAC office (nothing is sent automatically).
const DAC_CONTACT_URL = 'https://mail.google.com/mail/?view=cm&fs=1&to=dac%40bmu.edu.in';

const SECONDARY_BUTTON =
  'inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg border bg-white text-sm font-medium transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100';

function initialsOf(name = '') {
  return name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function IconTile({ name }) {
  return (
    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-[#f1effb] text-[#3d3793] flex items-center justify-center">
      <Icon name={name} className="text-[20px]" />
    </span>
  );
}

function SectionCard({ title, icon, children }) {
  return (
    <section className="bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
      <h2 className="flex items-center gap-2.5 px-5 sm:px-6 py-3.5 bg-[#f8f7fd] border-b border-slate-100 text-[15px] font-semibold text-slate-900">
        <Icon name={icon} className="text-[20px] text-[#3d3793]" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <IconTile name={icon} />
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">{value || '—'}</p>
      </div>
    </div>
  );
}

/**
 * The signed-in user's own profile: identity header, role-specific details,
 * account security and DAC contact. Shows only the fields the role has.
 */
function ProfileView({ user, role, error }) {
  const isStudent = role === 'student';
  const roleName = ROLE_NAMES[role] || toTitleCase(role);
  const program = user?.program ? String(user.program).toUpperCase() : null;

  // Shown beside the name in the header (students only; staff have no equivalents).
  const identity = isStudent
    ? [
        { icon: 'tag', label: 'Enrollment Number', value: user?.enrollment_no },
        { icon: 'school', label: 'Program', value: program },
      ]
    : [];

  const detailsTitle = isStudent ? 'Personal & Academic Information' : 'Account Information';
  const details = isStudent
    ? [
        { icon: 'mail', label: 'Email', value: user?.email },
        { icon: 'calendar_month', label: 'Year of study', value: user?.year ? `Year ${user.year}` : null },
        { icon: 'apartment', label: 'Hostel & room', value: [user?.hostel, user?.room].filter(Boolean).join(' · ') },
        { icon: 'family_restroom', label: 'Parent email', value: user?.parent_email },
      ]
    : [
        { icon: 'badge', label: 'Role', value: roleName },
        { icon: 'mail', label: 'Email', value: user?.email },
        ...(user?.hostel ? [{ icon: 'apartment', label: 'Hostel', value: user.hostel }] : []),
      ];

  return (
    <DACLayout>
      <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
        <PageHeader title="My Profile" subtitle="Manage your personal information and account details." />
        {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{error}</p>}

        {/* Identity header */}
        <section className="relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-20px_rgba(61,55,147,0.35)] px-5 sm:px-8 py-6">
          <svg
            className="pointer-events-none absolute bottom-0 right-0 h-20 w-[min(520px,70%)] text-[#3d3793]"
            viewBox="0 0 520 80"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M0 80 C120 40 220 70 320 42 C400 20 460 34 520 12 L520 80 Z" fill="currentColor" opacity="0.05" />
            <path d="M80 80 C190 52 280 74 380 52 C440 38 490 44 520 30 L520 80 Z" fill="currentColor" opacity="0.06" />
          </svg>

          <div className="relative flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0">
                <span className="absolute inset-0 rounded-full bg-[#ece9fb] text-[#3d3793] text-2xl sm:text-[28px] font-semibold flex items-center justify-center">
                  {initialsOf(user?.name)}
                </span>
                <svg className="absolute inset-0 -rotate-45" viewBox="0 0 100 100" aria-hidden="true">
                  <circle cx="50" cy="50" r="48" fill="none" stroke="#3d3793" strokeWidth="3" strokeLinecap="round" strokeDasharray="70 232" strokeDashoffset="-150" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-semibold text-slate-900 [overflow-wrap:anywhere]">{user?.name || '—'}</p>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#efedfb] text-[#3d3793] px-3 py-1 text-xs font-semibold">
                  <Icon name={ROLE_ICONS[role] || 'person'} className="text-[16px]" />
                  {roleName}
                </span>
              </div>
            </div>

            {identity.length > 0 && (
              <>
                <div className="hidden md:block w-px self-stretch bg-slate-200" aria-hidden="true" />

                <dl className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4 md:flex md:gap-10 border-t border-slate-100 pt-5 md:border-0 md:pt-0">
                  {identity.map((item) => (
                    <div key={item.label} className="flex items-center gap-3 min-w-0">
                      <IconTile name={item.icon} />
                      <div className="min-w-0">
                        <dt className="text-xs text-slate-500">{item.label}</dt>
                        <dd className="text-base font-semibold text-slate-900 tabular-nums [overflow-wrap:anywhere]">{item.value || '—'}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-start">
          <SectionCard title={detailsTitle} icon="person">
            <div className="px-5 sm:px-6 divide-y divide-slate-100">
              {details.map((row) => (
                <InfoRow key={row.label} {...row} />
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Account Security" icon="shield_lock">
            <div className="px-5 sm:px-6 py-4 flex flex-wrap items-center gap-x-4 gap-y-3">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <IconTile name="key" />
                <div>
                  <p className="text-xs text-slate-500">Password</p>
                  <p className="text-sm font-semibold text-slate-900 tracking-[0.2em]" aria-label="Password hidden">••••••••</p>
                </div>
              </div>
              <Link to="/settings" className={`${SECONDARY_BUTTON} border-[#3d3793]/40 text-[#3d3793] hover:bg-[#f5f3ff]`}>
                Change password
              </Link>
            </div>
          </SectionCard>
        </div>

        {/* Help / contact */}
        <section className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-[#e4e0f7] bg-gradient-to-r from-[#f3f1fd] to-[#faf9fe] px-5 sm:px-6 py-5">
          <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
            <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white text-[#3d3793] flex items-center justify-center shadow-sm">
              <Icon name="support_agent" className="text-[22px]" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-slate-900">Need help?</h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Contact the DAC office for any queries related to your profile, cases or policies.
              </p>
            </div>
          </div>
          <a
            href={DAC_CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contact Us: email the DAC office in Gmail (opens in a new tab)"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 w-full sm:w-auto shrink-0 rounded-lg bg-[#3d3793] hover:bg-[#2f2a75] text-white text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
          >
            <Icon name="mail" className="text-[18px]" />
            Contact Us
          </a>
        </section>
      </div>
    </DACLayout>
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

  return <ProfileView user={user} role={role} error={error} />;
}
