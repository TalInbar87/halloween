import { useState, type FormEvent } from 'react';
import { friendlyError } from '../lib/houses';

interface Props {
  /** Resolves when the server accepted the password; rejects with `wrong_password`, … */
  onUnlock: (password: string) => Promise<void>;
  /** Shown above the field, e.g. when a remembered password stopped working. */
  notice?: string;
}

/** The map is only for the neighbourhood: nothing is loaded until the password is accepted. */
export function AccessGate({ onUnlock, notice }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password) {
      setError('נא להזין את סיסמת השכונה');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onUnlock(password);
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  return (
    <div className="gate">
      <div className="card gate-card">
        <div className="gate-pumpkin" aria-hidden="true">
          🎃
        </div>
        <h2>המפה רק לשכונה 🤫</h2>
        <p className="hint">את הסיסמה מקבלים מהמארגנים בקבוצת השכונה.</p>
        {notice && <p className="gate-notice">{notice}</p>}
        <form className="form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="access-password">סיסמת השכונה</label>
          <input
            id="access-password"
            type="password"
            value={password}
            autoComplete="current-password"
            autoFocus
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn primary" disabled={busy}>
            כניסה למפה
          </button>
        </form>
      </div>
    </div>
  );
}
