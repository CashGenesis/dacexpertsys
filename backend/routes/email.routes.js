import { Router } from 'express';
import { requireRoles } from '../middleware/auth.middleware.js';
import { isEmailConfigured, renderEmailTemplate, sendEmail } from '../services/email.service.js';

const router = Router();

// POST /api/email/test — admin-only check that automatic email works.
// Always sends to EMAIL_TEST_TO from .env; the request cannot choose the recipient.
router.post('/test', requireRoles('admin'), async (req, res) => {
  if (!isEmailConfigured()) {
    return res.status(503).json({ error: 'Email is not configured. Set SMTP_USER and SMTP_PASS in .env.' });
  }

  const to = String(process.env.EMAIL_TEST_TO || '').trim();
  if (!to) {
    return res.status(400).json({ error: 'Set EMAIL_TEST_TO in .env to the address that should receive test emails.' });
  }

  const sentAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const { data, error } = await sendEmail({
    to,
    subject: 'DAC System: test email',
    html: renderEmailTemplate({
      heading: 'It works!',
      paragraphs: [
        'This test email confirms that the DAC Expert System can send automatic emails through Gmail SMTP.',
        `Sent from the Admin dashboard at ${sentAt} IST.`,
      ],
    }),
    text: `It works! The DAC Expert System can send automatic emails through Gmail SMTP. Sent at ${sentAt} IST.`,
  });

  if (error) {
    return res.status(502).json({ error: error.message || 'The email could not be sent', details: error });
  }
  return res.status(200).json({ message: `Test email sent to ${to}`, to, id: data?.id || null });
});

export default router;
