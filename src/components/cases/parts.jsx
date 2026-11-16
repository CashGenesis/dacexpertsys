import { AVATAR_TINTS, SEVERITY_PILLS, STATUS_DOTS, statusLabel, toTitleCase } from './caseUi';

export function Icon({ name, className = '' }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined leading-none ${className}`}>
      {name}
    </span>
  );
}

export function Avatar({ name = '', seed = 0, square = false, size = 'h-9 w-9' }) {
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span
      className={`${size} shrink-0 flex items-center justify-center text-xs font-semibold ${
        square ? 'rounded-lg' : 'rounded-md'
      } ${AVATAR_TINTS[Math.abs(seed) % AVATAR_TINTS.length]}`}
    >
      {initials || '?'}
    </span>
  );
}

export function Card({ title, icon, action, children, className = '' }) {
  return (
    <section className={`bg-white border border-slate-200/80 rounded-2xl ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-4">
          {title && (
            <h2 className="flex items-center gap-2.5 text-base font-semibold text-slate-900">
              {icon && <Icon name={icon} className="text-[22px] text-slate-700" />}
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="border-l-4 border-[#3d3793] pl-4">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function SeverityPill({ severity }) {
  const key = String(severity || 'low').toLowerCase();
  return (
    <span className={`inline-flex px-3 py-0.5 rounded-full text-xs font-medium ${SEVERITY_PILLS[key] || SEVERITY_PILLS.low}`}>
      {toTitleCase(key)}
    </span>
  );
}

export function StatusText({ status }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-slate-700 whitespace-nowrap">
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[status] || 'bg-slate-400'}`} />
      {statusLabel(status)}
    </span>
  );
}

export function EmptyState({ icon = 'inbox', children }) {
  return (
    <div className="py-12 flex flex-col items-center gap-2 text-sm text-slate-500">
      <Icon name={icon} className="text-[28px] text-slate-300" />
      {children}
    </div>
  );
}

export function Button({ variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-[#3d3793] hover:bg-[#332e7d] text-white',
    dark: 'bg-[#231f52] hover:bg-[#2f2a6b] text-white',
    outline: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
  };
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
