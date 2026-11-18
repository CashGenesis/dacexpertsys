import nodemailer from 'nodemailer';

// Automatic emails are sent through Gmail SMTP with Nodemailer.
// Configure in .env (backend only, never expose to the frontend):
//   SMTP_USER  - the Gmail address that sends the emails, e.g. dac.system@gmail.com
//   SMTP_PASS  - a 16-character Google App Password for that account (not the normal password)
//   EMAIL_FROM - optional display sender, e.g. "DAC System <dac.system@gmail.com>".
//                Gmail always sends from SMTP_USER, so keep the same address here.
//   SMTP_HOST / SMTP_PORT - optional, default smtp.gmail.com:465 (SSL)

let transporter = null;

function smtpUser() {
  return String(process.env.SMTP_USER || '').trim();
}

export function isEmailConfigured() {
  return Boolean(smtpUser() && String(process.env.SMTP_PASS || '').trim());
}

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 465;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465, // 465 = SSL from the start; 587 = STARTTLS
      auth: {
        user: smtpUser(),
        // App Passwords are shown with spaces ("abcd efgh ijkl mnop"); Gmail expects them without.
        pass: String(process.env.SMTP_PASS).replace(/\s+/g, ''),
      },
    });
  }
  return transporter;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Shared HTML layout for DAC emails. `paragraphs` are plain-text strings (escaped here).
 * Replace or extend this when the real email designs are ready.
 */
export function renderEmailTemplate({ heading, greetingName, paragraphs = [] }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 12px">${escapeHtml(p)}</p>`).join('');
  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f6fa;font-family:Arial,Helvetica,sans-serif;color:#1e293b">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;border:1px solid #e2e8f0">
      <p style="margin:0 0 4px;font-size:12px;color:#3d3793;font-weight:bold;letter-spacing:.08em;text-transform:uppercase">DAC Expert System</p>
      <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a">${escapeHtml(heading)}</h1>
      ${greetingName ? `<p style="margin:0 0 12px">Hello ${escapeHtml(greetingName)},</p>` : ''}
      ${body}
      <p style="margin:24px 0 0;font-size:12px;color:#64748b">This is an automatic message from the DAC Expert System, BML Munjal University.</p>
    </div>
  </body>
</html>`;
}

/**
 * Sends one email. Never throws: it returns { data, error } so a failed email
 * cannot break the request or workflow that triggered it.
 *
 * @param {object} options
 * @param {string|string[]} options.to
 * @param {string} options.subject
 * @param {string} [options.html]
 * @param {string} [options.text]
 * @param {string} [options.from]    defaults to EMAIL_FROM, then "DAC System <SMTP_USER>"
 * @param {string|string[]} [options.replyTo]
 * @returns {Promise<{ data: { id: string }|null, error: { message: string }|null, skipped?: boolean }>}
 */
export async function sendEmail({ to, subject, html, text, from, replyTo }) {
  if (!isEmailConfigured()) {
    console.warn(`[email] SMTP_USER / SMTP_PASS are not set; skipped "${subject}" to ${[].concat(to).join(', ')}`);
    return { data: null, error: null, skipped: true };
  }

  try {
    const info = await getTransporter().sendMail({
      from: from || process.env.EMAIL_FROM || `DAC System <${smtpUser()}>`,
      to,
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
    });

    if (info.rejected?.length) {
      const message = `Rejected recipients: ${info.rejected.join(', ')}`;
      console.error(`[email] "${subject}": ${message}`);
      return { data: null, error: { message } };
    }
    return { data: { id: info.messageId }, error: null };
  } catch (err) {
    // EAUTH usually means a wrong App Password or 2-Step Verification is off.
    const message = err?.code === 'EAUTH'
      ? 'Gmail rejected the login. Check SMTP_USER and the App Password in SMTP_PASS.'
      : (err?.message || 'Email send failed');
    console.error(`[email] Failed to send "${subject}":`, err?.message || err);
    return { data: null, error: { message } };
  }
}

export default { isEmailConfigured, sendEmail, renderEmailTemplate };
