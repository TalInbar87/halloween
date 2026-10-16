import { useEffect, useState } from 'react';
import { HALLOWEEN_START, timeLeft } from '../lib/countdown';

interface Props {
  target?: Date;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function Countdown({ target = HALLOWEEN_START }: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const t = timeLeft(now, target);

  if (t.done) {
    return (
      <div className="countdown started">
        <span className="countdown-started">ההאלווין התחיל! צאו לאסוף ממתקים 🎃</span>
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
