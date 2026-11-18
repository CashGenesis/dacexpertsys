import { useState } from 'react';
import { Button, Card, Icon } from '../../components/cases/parts';
import { sendTestEmail } from '../../services/api';

/**
 * Admin Settings → Email Test.
 * Sends one test email through Gmail SMTP to EMAIL_TEST_TO (configured in the backend .env).
 */
export default function EmailTest() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success' | 'error', text }

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    try {
      const response = await sendTestEmail();
      setResult({ type: 'success', text: `${response.message}. Check that inbox (and the spam folder).` });
    } catch (err) {
      setResult({ type: 'error', text: err?.message || 'The test email could not be sent.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-[#0f172a]">Email Test</h3>
        <p className="text-sm text-[#64748b] mt-0.5">
          Check that automatic emails are working. The test email always goes to the address set as
          <code className="mx-1 bg-slate-100 rounded px-1 py-0.5 text-xs">EMAIL_TEST_TO</code>
          in the backend <code className="bg-slate-100 rounded px-1 py-0.5 text-xs">.env</code>.
        </p>
      </div>

      <Card title="Send a test email" icon="mail">
        <div className="px-6 pb-6 space-y-4">
          <p className="text-sm text-slate-600">
            The email is sent through Gmail SMTP with the subject “DAC System: test email” and the message “It works!”.
          </p>

          {result && (
            <p
              role="status"
              className={`flex items-start gap-2 text-sm rounded-xl px-4 py-3 border ${
                result.type === 'success'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                  : 'bg-rose-50 border-rose-100 text-rose-700'
              }`}
            >
              <Icon name={result.type === 'success' ? 'check_circle' : 'error'} className="text-[18px] mt-0.5" />
              <span>{result.text}</span>
            </p>
          )}

          <Button onClick={handleSend} disabled={sending}>
            <Icon name={sending ? 'progress_activity' : 'send'} className={`text-[18px] ${sending ? 'animate-spin' : ''}`} />
            {sending ? 'Sending…' : 'Send test email'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
