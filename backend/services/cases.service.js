import pool from '../config/db.js';
import {
  createNotificationsForRoleService,
  createNotificationService,
} from './notifications.service.js';
import { createCaseTimelineService } from './timeline.service.js';

// Student details live in users; cases only store student_id.
const CASE_WITH_STUDENT_SELECT = `
  SELECT
    cases.*,
    users.name AS student_name,
    users.enrollment_no,
    users.program,
    users.gender,
    users.hostel,
    users.room
  FROM cases
  JOIN users ON users.id = cases.student_id
`;

const ROLE_LABELS = { warden: 'Warden', chief_warden: 'Chief Warden', dsw: 'DSW', admin: 'Admin' };

function canActOnRole(role) {
  return ['chief_warden', 'dsw', 'admin'].includes(String(role || '').toLowerCase());
}

function getNextWorkflowState(role) {
  const normalizedRole = String(role || '').toLowerCase();
  if (normalizedRole === 'chief_warden') {
    return {
      status: 'pending_dsw',
      assignedToRole: 'dsw',
      notifyRole: 'dsw',
      notifyMessage: 'Case approved by Chief Warden. Ready for review.',
      event: 'Approved by Chief Warden and forwarded to DSW.',
      stageLabel: 'DSW review',
    };
  }

  if (normalizedRole === 'dsw') {
    return {
      status: 'pending_admin',
      assignedToRole: 'admin',
      notifyRole: 'admin',
      notifyMessage: 'Case forwarded by DSW. Final decision required.',
      event: 'Approved by DSW and forwarded to Admin.',
      stageLabel: 'Admin decision',
    };
  }

  if (normalizedRole === 'admin') {
    return {
      status: 'resolved',
      assignedToRole: null,
      notifyRole: null,
      notifyMessage: null,
      event: 'Final decision recorded by Admin. Case resolved.',
      stageLabel: 'resolved',
    };
  }

  return null;
}

export async function getAllCasesService({ requesterRole, requesterId, role, status }) {
  const conditions = [];
  const values = [];

  if (requesterRole === 'student') {
    values.push(requesterId);
    conditions.push(`cases.student_id = $${values.length}`);
  } else if (requesterRole === 'warden') {
    // Wardens oversee disciplinary cases; only restrict if explicitly asked for "my_created_only"
    if (role === 'my_created_only') {
      values.push(requesterId);
      conditions.push(`cases.created_by = $${values.length}`);
    }
  } else if (requesterRole === 'chief_warden' || requesterRole === 'admin') {
    if (role && role !== 'all' && requesterRole !== 'admin') {
      values.push(role);
      conditions.push(`cases.assigned_to_role = $${values.length}`);
    }
  } else if (requesterRole === 'dsw') {
    // DSW needs pending queue plus downstream status visibility for dashboard stats.
    if (status) {
      values.push(status);
      conditions.push(`cases.status = $${values.length}`);
    } else {
      conditions.push(`cases.status IN ('pending_dsw', 'pending_admin', 'resolved')`);
    }
  }

  if (status && requesterRole !== 'dsw') {
    values.push(status);
    conditions.push(`cases.status = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `
    ${CASE_WITH_STUDENT_SELECT}
    ${whereClause}
    ORDER BY cases.incident_date DESC NULLS LAST, cases.created_at DESC
  `;

  const result = await pool.query(query, values);
  return result.rows;
}

export async function createCaseService(payload, requesterId, requesterRole = 'warden') {
  const {
    student_id: studentId,
    offense_type: offenseType,
    description = null,
    location = null,
    incident_date: incidentDate = null,
    severity = 'low',
    penalty_points: penaltyPoints = 0,
    evidence_url: evidenceUrl = null,
  } = payload;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

  const query = `
    INSERT INTO cases (
      student_id,
      created_by,
      created_by_role,
      assigned_to_role,
      reported_by,
      offense_type,
      status,
      severity,
      description,
      location,
      incident_date,
      penalty_points,
      evidence_url
    )
    VALUES ($1, $2, $12, $3, $2, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;

    const values = [
      studentId,
      requesterId,
      'chief_warden',
      offenseType,
      'pending_chief',
      severity,
      description,
      location,
      incidentDate,
      penaltyPoints,
      evidenceUrl,
      requesterRole,
    ];
    const result = await client.query(query, values);
    // Give app-created cases the same public ID format as imported ones: DAC-<year>-<5-digit id>.
    const withPublicId = await client.query(
      `UPDATE cases
       SET external_case_id = 'DAC-' || to_char(COALESCE(incident_date, NOW()), 'YYYY') || '-' || lpad(id::text, 5, '0')
       WHERE id = $1 AND external_case_id IS NULL
       RETURNING *`,
      [result.rows[0].id]
    );
    const createdCase = withPublicId.rows[0] || result.rows[0];

    await createNotificationsForRoleService(
      {
        role: 'chief_warden',
        message: `New case created by ${ROLE_LABELS[requesterRole] || 'staff'}. Click to review.`,
        caseId: createdCase.id,
      },
      client,
    );

    await createCaseTimelineService(
      {
        caseId: createdCase.id,
        event: 'Case created and assigned to Chief Warden.',
        performedBy: requesterId,
      },
      client,
    );

    await client.query('COMMIT');
    return createdCase;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getCaseHistoryService({ requesterRole, requesterId, limit = 6 }) {
  const normalizedRole = String(requesterRole || '').toLowerCase();
  const values = [];
  const conditions = [];

  if (normalizedRole === 'student') {
    values.push(requesterId);
    conditions.push(`cases.student_id = $${values.length}`);
  }

  values.push(limit);
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      cases.id,
      cases.offense_type,
      cases.status,
      cases.created_at,
      cases.incident_date,
      COALESCE(users.name, 'Unknown Student') AS student_name
    FROM cases
    LEFT JOIN users ON users.id = cases.student_id
    ${whereClause}
    ORDER BY cases.incident_date DESC NULLS LAST, cases.created_at DESC
    LIMIT $${values.length}
  `;

  const result = await pool.query(query, values);
  return result.rows;
}

export async function approveCaseService(caseId, actor) {
  if (!canActOnRole(actor?.role)) {
    throw new Error('FORBIDDEN_ROLE');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT * FROM cases WHERE id = $1 FOR UPDATE', [caseId]);
    const currentCase = existing.rows[0];
    if (!currentCase) {
      throw new Error('CASE_NOT_FOUND');
    }

    if (String(currentCase.status || '').toLowerCase() === 'resolved') {
      throw new Error('CASE_ALREADY_RESOLVED');
    }

    if (String(currentCase.assigned_to_role || '').toLowerCase() !== String(actor.role || '').toLowerCase()) {
      throw new Error('NOT_ASSIGNED_ROLE');
    }

    const nextState = getNextWorkflowState(actor.role);
    if (!nextState) {
      throw new Error('INVALID_TRANSITION');
    }

    const updated = await client.query(
      `
      UPDATE cases
      SET
        status = $2::case_status,
        assigned_to_role = $3::user_role,
        resolved_by = CASE WHEN $2::case_status = 'resolved'::case_status THEN $4 ELSE resolved_by END,
        resolved_by_role = CASE WHEN $2::case_status = 'resolved'::case_status THEN $5::user_role ELSE resolved_by_role END,
        resolved_at = CASE WHEN $2::case_status = 'resolved'::case_status THEN NOW() ELSE resolved_at END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [caseId, nextState.status, nextState.assignedToRole, actor.id, actor.role],
    );
    const updatedCase = updated.rows[0];

    if (nextState.notifyRole) {
      await createNotificationsForRoleService(
        {
          role: nextState.notifyRole,
          message: nextState.notifyMessage,
          caseId: updatedCase.id,
        },
        client,
      );
    }

    if (updatedCase.created_by) {
      const caseRef = updatedCase.external_case_id || `#${updatedCase.id}`;
      const creatorMessage = nextState.status === 'resolved'
        ? `Case ${caseRef} has been resolved.`
        : `Case ${caseRef} moved to ${nextState.stageLabel}.`;
      await createNotificationService(
        {
          userId: updatedCase.created_by,
          message: creatorMessage,
          caseId: updatedCase.id,
        },
        client,
      );
    }

    await createCaseTimelineService(
      {
        caseId: updatedCase.id,
        event: nextState.event,
        performedBy: actor.id,
      },
      client,
    );

    await client.query('COMMIT');
    return updatedCase;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getCaseByIdService(caseId) {
  const result = await pool.query(`${CASE_WITH_STUDENT_SELECT} WHERE cases.id = $1`, [caseId]);
  return result.rows[0] || null;
}

const ACTIVE_CASE_STATUSES = ['pending_chief', 'pending_dsw', 'pending_admin'];

// One student (by enrollment number) plus all of their DAC cases. The summary is
// computed from the same case rows that are returned, so totals match the history.
export async function getStudentProfileService(enrollmentNo) {
  const studentResult = await pool.query(
    `SELECT id, name, email, enrollment_no, program, year, hostel, room, gender, student_status
     FROM users
     WHERE role = 'student' AND enrollment_no = $1`,
    [enrollmentNo]
  );
  const student = studentResult.rows[0];
  if (!student) return null;

  const casesResult = await pool.query(
    `${CASE_WITH_STUDENT_SELECT}
     WHERE cases.student_id = $1
     ORDER BY cases.incident_date DESC NULLS LAST, cases.id DESC`,
    [student.id]
  );
  const cases = casesResult.rows;

  const summary = {
    total_cases: cases.length,
    total_points: cases.reduce((sum, c) => sum + Number(c.penalty_points || 0), 0),
    active_cases: cases.filter((c) => ACTIVE_CASE_STATUSES.includes(c.status)).length,
    resolved_cases: cases.filter((c) => c.status === 'resolved').length,
  };

  return { student, summary, cases };
}

export async function updateCaseService(caseId, payload, actor) {
  const updates = [];
  const values = [];

  const allowedFields = {
    offense_type: 'offense_type',
    description: 'description',
    location: 'location',
    incident_date: 'incident_date',
    severity: 'severity',
    penalty_points: 'penalty_points',
    evidence_url: 'evidence_url',
    fine: 'fine',
    decision: 'decision',
  };

  Object.entries(allowedFields).forEach(([key, column]) => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      values.push(payload[key]);
      updates.push(`${column} = $${values.length}`);
    }
  });

  if (!updates.length) {
    return getCaseByIdService(caseId);
  }

  values.push(caseId);
  const query = `
    UPDATE cases
    SET ${updates.join(', ')}
    WHERE id = $${values.length}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  const updatedCase = result.rows[0] || null;

  if (updatedCase && actor?.id) {
    await createCaseTimelineService({
      caseId: updatedCase.id,
      event: 'Case details updated.',
      performedBy: actor.id,
    });
  }

  return updatedCase;
}

export async function deleteCaseService(caseId) {
  const result = await pool.query('DELETE FROM cases WHERE id = $1 RETURNING *', [caseId]);
  return result.rows[0] || null;
}
