import { useState } from 'react';
import DACLayout from '../components/layout/DACLayout';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../services/api';

const CARD =
  'bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-22px_rgba(61,55,147,0.3)]';

function Symbol({ name, className = '' }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined leading-none ${className}`}>
      {name}
    </span>
  );
}

function IconTile({ name, size = 'h-10 w-10', iconClass = 'text-[20px]' }) {
  return (
    <span className={`${size} shrink-0 overflow-hidden rounded-xl bg-[#efedfb] text-[#3d3793] flex items-center justify-center`}>
      <Symbol name={name} className={iconClass} />
    </span>
  );
}

function InfoBlock({ icon, label, children }) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#f8f7fd] border border-[#efedfb]">
      <IconTile name={icon} size="h-9 w-9" iconClass="text-[18px]" />
      <div className="min-w-0">
        <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        {children}
      </div>
    </div>
  );
}

/** Password input with a show/hide toggle (display only; value and validation are the form's). */
function PasswordField({ id, label, value, onChange, error }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder="••••••••"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full h-11 pl-4 pr-12 rounded-xl bg-[#f8f7fd] border text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-4 transition-colors ${
            error
              ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
              : 'border-[#e6e3f5] focus:border-[#3d3793] focus:ring-[#3d3793]/10'
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 overflow-hidden rounded-lg flex items-center justify-center text-slate-400 hover:text-[#3d3793] hover:bg-[#efedfb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3d3793]/30 transition-colors"
        >
          <Symbol name={visible ? 'visibility' : 'visibility_off'} className="text-[20px]" />
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>
      )}
    </div>
  );
}

export default function Settings() {
  const { currentUser, role } = useAuth();

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const set = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setErrorMessage('');
    setSuccessMessage('');
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.currentPassword) nextErrors.currentPassword = 'Current password is required';
    if (!form.newPassword) nextErrors.newPassword = 'New password is required';
    if (!form.confirmPassword) nextErrors.confirmPassword = 'Confirm password is required';

    if (form.newPassword && form.confirmPassword && form.newPassword !== form.confirmPassword) {
      nextErrors.confirmPassword = 'New password and confirm password must match';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      await changePassword({
        userId: currentUser?.id,
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccessMessage('Password changed successfully.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DACLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-[#0f172a] tracking-tight">
            Settings &amp; Security
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Manage your credentials, authentication preferences, and notification defaults
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

          {/* Left Column: Account Summary Card */}
          <div className={`md:col-span-5 ${CARD} p-5 sm:p-6 space-y-5`}>
            <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
              <div className="h-14 w-14 shrink-0 rounded-2xl bg-[#efedfb] ring-1 ring-[#3d3793]/10 text-[#3d3793] flex items-center justify-center font-semibold text-xl">
                {(currentUser?.name || currentUser?.displayName || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-[#0f172a] truncate">
                  {currentUser?.name || currentUser?.displayName || 'User Account'}
                </h3>
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5" title={currentUser?.email || undefined}>
                  {currentUser?.email}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <InfoBlock icon="badge" label="Assigned Role">
                <span className="text-sm font-semibold text-[#0f172a] mt-0.5 block capitalize">
                  {role?.replace(/_/g, ' ') || 'Officer'}
                </span>
              </InfoBlock>

              <InfoBlock icon="key" label="Authentication Type">
                <span className="text-sm font-semibold text-[#0f172a] mt-0.5 block">
                  Institutional SSO &amp; Password
                </span>
              </InfoBlock>

              <InfoBlock icon="verified_user" label="Security Level">
                <span className="text-sm font-semibold text-emerald-600 mt-0.5 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                  Authenticated Session
                </span>
              </InfoBlock>
            </div>
          </div>

          {/* Right Column: Password Change Form */}
          <div className={`md:col-span-7 ${CARD} p-5 sm:p-8 space-y-6`}>
            <div className="flex items-start gap-4">
              <IconTile name="lock" size="h-11 w-11" iconClass="text-[22px]" />
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[#0f172a]">
                  Change Password
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Ensure your account uses a secure password of at least 8 characters
                </p>
              </div>
            </div>

            {successMessage && (
              <div role="status" className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium flex items-center gap-2">
                <Symbol name="check_circle" className="text-[18px]" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-center gap-2">
                <Symbol name="error" className="text-[18px]" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <PasswordField
                id="current-password"
                label="Current Password"
                value={form.currentPassword}
                onChange={set('currentPassword')}
                error={errors.currentPassword}
              />
              <PasswordField
                id="new-password"
                label="New Password"
                value={form.newPassword}
                onChange={set('newPassword')}
                error={errors.newPassword}
              />
              <PasswordField
                id="confirm-password"
                label="Confirm New Password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                error={errors.confirmPassword}
              />

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto h-11 px-5 rounded-xl bg-[#3d3793] hover:bg-[#2f2a75] text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#3d3793]/20"
                >
                  <Symbol name={loading ? 'progress_activity' : 'lock'} className={`text-[18px] ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Updating Password...' : 'Save Password Changes'}
                  {!loading && <Symbol name="arrow_forward" className="text-[18px]" />}
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </DACLayout>
  );
}
