import { useEffect } from 'react';

const SHOW_MS = 4500;

/** A small candy joke that pops up after marking a house; tap or wait to dismiss. */
export function JokeToast({ joke, onDone }: { joke: string; onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, SHOW_MS);
    return () => clearTimeout(id);
  }, [joke, onDone]);

  return (
    <div className="joke-toast" role="status" aria-live="polite" onClick={onDone} key={joke}>
      {joke}
    </div>
  );
}
