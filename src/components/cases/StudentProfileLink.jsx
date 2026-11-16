import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentProfilePath } from './caseUi';
import { Icon } from './parts';

const STAFF_ROLES = ['admin', 'dsw', 'warden', 'chief_warden'];

/**
 * "View Profile" link for staff views. Renders nothing for students (the profile
 * API is staff-only) or when the enrollment number is unknown. Clicks do not
 * bubble up, so it can sit inside clickable table rows.
 */
export default function StudentProfileLink({ enrollment, className = '' }) {
  const { role } = useAuth();
  if (!enrollment || !STAFF_ROLES.includes(role)) return null;

  return (
    <Link
      to={studentProfilePath(enrollment)}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 text-xs font-semibold text-[#3d3793] hover:text-[#332e7d] hover:underline ${className}`}
    >
      View Profile
      <Icon name="arrow_forward" className="text-[14px]" />
    </Link>
  );
}
