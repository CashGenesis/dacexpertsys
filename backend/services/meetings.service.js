import pool from '../config/db.js';
import { createNotificationService } from './notifications.service.js';
import { createCaseTimelineService } from './timeline.service.js';
import { isEmailConfigured, renderEmailTemplate, sendEmail } from './email.service.js';

// In-person DAC meetings. When a case reaches the Admin (status pending_admin), the Admin
// schedules a meeting with the student: it is saved, the student gets an in-app notification,
// a timeline entry is written, and an email is sent (if Gmail SMTP is configured).

// Times are shown to people in campus time.
const MEETING_TIME_ZONE = process.env.MEETING_TIME_ZONE || 'Asia/Kolkata';

const MEETING_SELECT = `
  SELECT m.id, m.case_id, m.student_id, m.scheduled_at, m.location, m.notes,
         m.email_sent, m.email_status, m.created_at,
         cases.external_case_id, cases.offense_type, cases.status AS case_status,
         creator.name AS created_by_name
  FROM case_meetings m
  JOIN cases ON cases.id = m.case_id
  LEFT JOIN users creator ON creator.id = m.created_by`;

export function formatMeetingTime(date) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: MEETING_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

async function emailMeeting({ student, caseRow, meeting }) {
  if (!student.email) return { sent: false, status: 'Student has no email address' };
  if (!isEmailConfigured()) return { sent: false, status: 'Email is not configured' };

  const caseRef = caseRow.external_case_id || `#${caseRow.id}`;
  const when = formatMeetingTime(meeting.scheduled_at);
  const paragraphs = [
    `Your case ${caseRef}${caseRow.offense_type ? ` (${caseRow.offense_type})` : ''} has been forwarded to the Disciplinary Action Committee for a final decision.`,
    `You are required to attend an in-person meeting on ${when} at ${meeting.location}.`,
    ...(meeting.notes ? [`Note from the committee: ${meeting.notes}`] : []),
    'Please carry your university ID card. If you cannot attend, contact the Office of the Dean, Student Welfare before the meeting.',
  ];
  const { error } = await sendEmail({
    to: student.email,
    subject: `DAC meeting for case ${caseRef}: ${when}`,
    html: renderEmailTemplate({ heading: 'DAC meeting scheduled', greetingName: student.name, paragraphs }),
    text: [`Hello ${student.name},`, ...paragraphs].join('\n\n'),
  });
  if (error) return { sent: false, status: error.message || 'Email provider rejected the email' };
  return { sent: true, status: `Sent to ${student.email}` };
}

/**
 * Schedules a meeting for a case at the Admin stage.
 * Throws an Error with .status (400/404/409) for invalid requests.
 */
export async function scheduleCaseMeetingService(caseId, { scheduledAt, location, notes }, actor) {
  const when = new Date(scheduledAt);
  if (!scheduledAt || Number.isNaN(when.getTime())) {
    throw Object.assign(new Error('A valid meeting date and time is required.'), { status: 400 });
  }
  if (when.getTime() < Date.now() - 60 * 1000) {
    throw Object.assign(new Error('The meeting must be in the future.'), { status: 400 });
  }
  const place = String(location || '').trim();
  if (!place) throw Object.assign(new Error('Meeting location is required.'), { status: 400 });
  if (place.length > 200) throw Object.assign(new Error('Location must be at most 200 characters.'), { status: 400 });
  const note = String(notes || '').trim().slice(0, 1000) || null;

  const caseResult = await pool.query(
    `SELECT cases.id, cases.external_case_id, cases.offense_type, cases.status, cases.student_id,
            users.name AS student_name, users.email AS student_email
     FROM cases JOIN users ON users.id = cases.student_id
     WHERE cases.id = $1`,
    [caseId],
  );
  const caseRow = caseResult.rows[0];
  if (!caseRow) throw Object.assign(new Error('Case not found'), { status: 404 });
  if (caseRow.status !== 'pending_admin') {
    throw Object.assign(new Error('Meetings can only be scheduled for cases waiting for the Admin decision.'), { status: 409 });
  }

  const client = await pool.connect();
  let meeting;
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO case_meetings (case_id, student_id, scheduled_at, location, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [caseRow.id, caseRow.student_id, when.toISOString(), place, note, actor.id || null],
    );
    meeting = inserted.rows[0];
    const whenText = formatMeetingTime(meeting.scheduled_at);
    await createNotificationService({
      userId: caseRow.student_id,
      caseId: caseRow.id,
      message: `DAC meeting scheduled for ${whenText} at ${place}. Attendance in person is required.`,
    }, client);
    await createCaseTimelineService({
      caseId: caseRow.id,
      performedBy: actor.id,
      event: `DAC meeting scheduled with the student for ${whenText} at ${place}.`,
    }, client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  // Email after the commit: a mail failure never undoes the meeting.
  let email;
  try {
    email = await emailMeeting({
      student: { name: caseRow.student_name, email: caseRow.student_email },
      caseRow,
      meeting,
    });
  } catch (error) {
    email = { sent: false, status: error?.message || 'Email could not be sent' };
  }
  await pool.query('UPDATE case_meetings SET email_sent = $2, email_status = $3 WHERE id = $1', [meeting.id, email.sent, email.status]);

  const saved = await pool.query(`${MEETING_SELECT} WHERE m.id = $1`, [meeting.id]);
  return saved.rows[0];
}

export async function getCaseMeetingsService(caseId) {
  const result = await pool.query(`${MEETING_SELECT} WHERE m.case_id = $1 ORDER BY m.scheduled_at DESC`, [caseId]);
  return result.rows;
}

/** The student's own meetings: upcoming first, then up to 5 recent past ones. */
export async function getStudentMeetingsService(studentId) {
  const result = await pool.query(
    `${MEETING_SELECT}
     WHERE m.student_id = $1 AND m.scheduled_at >= NOW() - INTERVAL '30 days'
     ORDER BY (m.scheduled_at < NOW()), ABS(EXTRACT(EPOCH FROM (m.scheduled_at - NOW())))
     LIMIT 10`,
    [studentId],
  );
  // Email delivery details are for staff only.
  return result.rows.map(({ email_status: _status, created_by_name: _by, ...row }) => row);
}
