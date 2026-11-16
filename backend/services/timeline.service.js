import pool from '../config/db.js';

function resolveDbClient(client) {
  return client || pool;
}

export async function createCaseTimelineService({ caseId, event, performedBy }, client) {
  const db = resolveDbClient(client);
  const query = `
    INSERT INTO case_timeline (case_id, event, performed_by)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const result = await db.query(query, [caseId, event, performedBy || null]);
  return result.rows[0] || null;
}

export async function getCaseTimelineService(caseId) {
  const query = `
    SELECT t.id, t.case_id, t.event, t.notes, t.performed_by, t.timestamp,
           COALESCE(t.performed_by_role, u.role) AS performed_by_role,
           u.name AS performed_by_name
    FROM case_timeline t
    LEFT JOIN users u ON u.id = t.performed_by
    WHERE t.case_id = $1
    ORDER BY t.timestamp ASC, t.id ASC
  `;
  const result = await pool.query(query, [caseId]);
  return result.rows;
}

export async function updateCaseTimelineService(timelineId, payload) {
  const updates = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(payload, 'event')) {
    values.push(payload.event);
    updates.push(`event = $${values.length}`);
  }

  if (!updates.length) {
    const existing = await pool.query('SELECT * FROM case_timeline WHERE id = $1', [timelineId]);
    return existing.rows[0] || null;
  }

  values.push(timelineId);
  const query = `
    UPDATE case_timeline
    SET ${updates.join(', ')}
    WHERE id = $${values.length}
    RETURNING *
  `;
  const result = await pool.query(query, values);
  return result.rows[0] || null;
}

export async function deleteCaseTimelineService(timelineId) {
  const result = await pool.query('DELETE FROM case_timeline WHERE id = $1 RETURNING *', [timelineId]);
  return result.rows[0] || null;
}
