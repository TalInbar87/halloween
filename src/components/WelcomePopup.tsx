import { useEffect, useId, useRef, useState } from 'react';
import { markWelcomeSeen, shouldShowWelcome } from '../lib/welcome';
import { HALLOWEEN_START } from '../lib/countdown';
import { currentTime } from '../lib/clock';
import { Countdown } from './Countdown';

interface Props {
  /** Injected for tests; defaults to the real document. */
  doc?: { cookie: string };
}

export function WelcomePopup({ doc = document }: Props) {
  // Once a day, until Halloween starts — after that there's nothing to count down to.
  const [open, setOpen] = useState(() => currentTime() < HALLOWEEN_START && shouldShowWelcome(doc));
  const titleId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  function close() {
    markWelcomeSeen(doc);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    buttonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <div className="overlay welcome-overlay" onClick={close}>
      <div
        className="welcome"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="welcome-sky" aria-hidden="true">
          <span className="bat bat-1">🦇</span>
          <span className="bat bat-2">🦇</span>
          <span className="bat bat-3">🦇</span>
          <span className="welcome-moon" />
          <span className="welcome-pumpkin">🎃</span>
        </div>

        <h2 id={titleId}>
          ברוכים הבאים למפת השכונה הכי טובה <span dir="ltr">EVER!</span>
        </h2>
        <Countdown />

        <button ref={buttonRef} type="button" className="btn primary welcome-go" onClick={close}>
          יאללה, מתחילים!
        </button>
      </div>
    </div>
  );
}
