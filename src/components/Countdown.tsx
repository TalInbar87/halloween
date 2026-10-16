import { useEffect, useState } from 'react';
import { HALLOWEEN_START, timeLeft } from '../lib/countdown';
import { currentTime } from '../lib/clock';

/** Shown from 17:00 on the 31st, both under the title and in the welcome popup. */
export function StartedMessage({ className }: { className: string }) {
  return (
    <p className={className}>
      <span className="started-main">ההאלווין התחיל! צאו לאסוף ממתקים 🎃</span>
      <span className="started-note">(ואל תשכחו לצחצח שיניים טוב טוב לפני השינה 🪥🦷)</span>
    </p>
  );
}

interface Props {
  target?: Date;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function Countdown({ target = HALLOWEEN_START }: Props) {
  const [now, setNow] = useState(currentTime);

  useEffect(() => {
    const id = setInterval(() => setNow(currentTime()), 1000);
    return () => clearInterval(id);
  }, []);

  const t = timeLeft(now, target);

  if (t.done) {
    return (
      <div className="countdown started">
        <StartedMessage className="countdown-started" />
      </div>
    );
  }

  const units = [
    { value: String(t.days), label: 'ימים' },
    { value: pad(t.hours), label: 'שעות' },
    { value: pad(t.minutes), label: 'דקות' },
    { value: pad(t.seconds), label: 'שניות' },
  ];

  return (
    <div className="countdown">
      <span className="countdown-title">ההאלווין מתחיל בעוד</span>
      <div
        className="countdown-units"
        dir="ltr"
        role="timer"
        aria-label={`ההאלווין מתחיל בעוד ${t.days} ימים, ${t.hours} שעות ו-${t.minutes} דקות`}
      >
        {units.map((u) => (
          <div className="countdown-unit" key={u.label} aria-hidden="true">
            <span className="countdown-value">{u.value}</span>
            <span className="countdown-label">{u.label}</span>
          </div>
        ))}
      </div>
      <span className="countdown-date">שבת 31.10 · 17:00</span>
    </div>
  );
}
