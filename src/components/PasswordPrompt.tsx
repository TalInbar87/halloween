import { useId, useState, type FormEvent } from 'react';
import { friendlyError } from '../lib/houses';

interface Props {
  /** Rejects with `wrong_password`, `rate_limited`, … */
  verify: (password: string) => Promise<void>;
  onUnlock: (password: string) => void;
  onCancel: () => void;
}

export function PasswordPrompt({ verify, onUnlock, onCancel }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const titleId = useId();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password) {
      setError('נא להזין את סיסמת המבוגרים');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await verify(password);
      onUnlock(password);
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={onCancel}>
      <div
        className="card dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
      >
        <h2 id={titleId}>כניסת מבוגרים</h2>
        <form className="form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="admin-password">סיסמת מבוגרים</label>
          <input
            id="admin-password"
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
          <div className="dialog-actions">
            <button type="submit" className="btn primary" disabled={busy}>
              כניסה
            </button>
            <button type="button" className="btn secondary" onClick={onCancel}>
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
