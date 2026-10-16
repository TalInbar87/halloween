import { useEffect, useId, useRef, useState } from 'react';

const COLORS = ['#ff7a1a', '#7c4dff', '#3ecf8e', '#ffd166', '#ff5a5f'];
const PIECES = Array.from({ length: 48 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 12) * 0.12,
  duration: 2.4 + (i % 5) * 0.35,
  color: COLORS[i % COLORS.length],
  rotate: (i * 47) % 360,
}));

/** Confetti + trophy the moment the kid finishes the whole neighbourhood. */
export function Celebration({ done }: { done: boolean }) {
  const [open, setOpen] = useState(false);
  const wasDone = useRef(done); // finished before the page opened → don't celebrate again
  const titleId = useId();

  useEffect(() => {
    if (done && !wasDone.current) setOpen(true);
    wasDone.current = done;
  }, [done]);

  if (!open) return null;

  return (
    <div className="overlay celebration" onClick={() => setOpen(false)}>
      <div className="confetti" aria-hidden="true">
        {PIECES.map((p, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${p.left}%`,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              transform: `rotate(${p.rotate}deg)`,
            }}
          />
        ))}
      </div>
      <div
        className="card dialog celebration-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="celebration-trophy" aria-hidden="true">
          🏆
        </div>
        <h2 id={titleId}>סיימתם את כל השכונה!</h2>
        <p>איזה סיבוב! עכשיו הביתה לספור ממתקים 🍬</p>
        <button type="button" className="btn primary" onClick={() => setOpen(false)} autoFocus>
          יששש!
        </button>
      </div>
    </div>
  );
}
