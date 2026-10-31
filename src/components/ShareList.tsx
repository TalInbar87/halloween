import { useState } from 'react';
import { buildWhatsAppList } from '../lib/whatsappList';
import type { House } from '../lib/types';

/**
 * Send the list to someone without a smartphone. Uses the phone's share menu rather than
 * a wa.me link: a long list doesn't fit in a URL, and addresses shouldn't sit in one.
 */
export function ShareList({ houses }: { houses: House[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const canShare = typeof navigator.share === 'function';

  async function share() {
    setMessage(null);
    try {
      await navigator.share({ text: buildWhatsAppList(houses) });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setMessage('לא הצלחנו לפתוח את השיתוף. נסו להעתיק את הרשימה.');
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(buildWhatsAppList(houses));
      setMessage('הרשימה הועתקה. הדביקו אותה בוואטסאפ.');
    } catch {
      setMessage('לא הצלחנו להעתיק את הרשימה.');
    }
  }

  return (
    <div className="share-list">
      {canShare && (
        <button type="button" className="btn primary" onClick={share}>
          שיתוף בוואטסאפ 💬
        </button>
      )}
      <button type="button" className="btn secondary" onClick={copy}>
        העתקת הרשימה 📋
      </button>
      {message && (
        <p className="hint share-message" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
