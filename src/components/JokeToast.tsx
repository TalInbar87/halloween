import { useEffect } from 'react';
import type { Joke } from '../lib/jokes';

const SHOW_MS = 5000;

// Candies that burst out from behind the card, each flying at its own angle.
const BURST = ['🍬', '🍭', '🍫', '🍬', '🍪', '🍭', '🍫', '🍬', '🧁', '🍭', '🍫', '🍬'];

/** A candy joke that pops in the middle of the screen; tap anywhere or wait to dismiss. */
export function JokeToast({ joke, note, onDone }: { joke: Joke; note?: string; onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, SHOW_MS);
    return () => clearTimeout(id);
  }, [joke, onDone]);

  return (
    <div className="joke-stage" onClick={onDone} key={joke.text}>
      <div className="joke-burst" aria-hidden="true">
        {BURST.map((c, i) => (
          <span key={i} style={{ '--angle': `${(360 / BURST.length) * i}deg`, '--delay': `${(i % 3) * 0.05}s` } as React.CSSProperties}>
            {c}
          </span>
        ))}
      </div>
      <div className="joke-card" role="status" aria-live="polite">
        <div className="joke-emoji">{joke.emoji}</div>
        <p className="joke-text">{joke.text}</p>
        {note && <p className="joke-note">{note}</p>}
        <span className="joke-hint" aria-hidden="true">
          הקישו לסגירה
        </span>
      </div>
    </div>
  );
}
