import { useEffect, useState } from 'react';
import {
  detectInstallPlatform,
  dismissInstall,
  isInstallDismissed,
  isStandalone,
  type InstallPlatform,
} from '../lib/install';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

interface Props {
  /** Injected for tests; detected from the browser by default. */
  platform?: InstallPlatform;
  standalone?: boolean;
  storage?: Storage;
  /** Keep listening for the install event, but don't show the banner yet. */
  hidden?: boolean;
}

/** Small banner offering to put the map on the home screen. */
export function InstallHint({
  platform = detectInstallPlatform(navigator.userAgent, navigator.maxTouchPoints),
  standalone = isStandalone(window),
  storage = window.localStorage,
  hidden = false,
}: Props) {
  const [dismissed, setDismissed] = useState(() => isInstallDismissed(storage));
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);

  // Android fires this once, early, so listen even while the banner is hidden.
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (hidden || dismissed || standalone || !platform) return null;

  function close() {
    dismissInstall(storage);
    setDismissed(true);
  }

  async function install() {
    await promptEvent?.prompt();
    setPromptEvent(null);
  }

  return (
    <div className="install-hint">
      <img src="/icons/icon-192.png" alt="" width="36" height="36" />
      <div className="install-text">
        <strong>שימו את המפה על מסך הבית</strong>
        {platform === 'ios' ? (
          <>
            <span>לחצו על כפתור השיתוף ואז על "הוספה למסך הבית"</span>
            <small>סימוני "היינו כאן" לא עוברים בין הדפדפן לאייקון, כדאי לבחור אחד</small>
          </>
        ) : (
          !promptEvent && <span>בתפריט הדפדפן (⋮) בחרו "הוספה למסך הבית"</span>
        )}
      </div>
      {promptEvent && (
        <button type="button" className="btn primary install-btn" onClick={install}>
          התקנה
        </button>
      )}
      <button type="button" className="install-close" onClick={close} aria-label="סגירה">
        ✕
      </button>
    </div>
  );
}
