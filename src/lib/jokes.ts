// Popped after every "היינו כאן". A shuffle bag makes sure every joke is seen:
// all six once (in random order) before any repeats, then a fresh shuffle.

export interface Joke {
  text: string;
  emoji: string;
}

export const JOKES: readonly Joke[] = [
  { text: 'אני לא אוכל יותר מדי ממתקים. אני רק בודק אם זה טעים', emoji: '🍬🧐' },
  { text: 'אומרים שכסף לא קונה אושר. כנראה שלא קנו איתו מספיק שוקולד', emoji: '🍫💸' },
  { text: 'אני לא משאיר פירורים. אני מכבד את הממתק עד הסוף', emoji: '🍪😌' },
  { text: 'אין דבר כזה יותר מדי ממתקים. יש רק מעט מדי שקיות', emoji: '🛍️🍭' },
  { text: 'אם תראו אותי עם שקית ריקה - לא ראיתם כלום...', emoji: '🤫👀' },
  { text: 'שקט, אני סופר סוכריות', emoji: '🤓🍬' },
];

export interface JokeBag {
  /** Jokes still to show in this round, in order. */
  queue: number[];
  /** The joke shown last, so a new round never starts with it. */
  last?: number;
}

function shuffled(random: () => number): number[] {
  const order = JOKES.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function nextJoke(bag: JokeBag, random: () => number = Math.random): { index: number; bag: JokeBag } {
  let queue = [...bag.queue];
  if (queue.length === 0) {
    queue = shuffled(random);
    if (queue.length > 1 && queue[0] === bag.last) [queue[0], queue[1]] = [queue[1], queue[0]];
  }
  const index = queue.shift()!;
  return { index, bag: { queue, last: index } };
}

const BAG_KEY = 'halloween.jokes.v1';
const isJokeIndex = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < JOKES.length;

export function loadJokeBag(storage: Storage): JokeBag {
  try {
    const raw = JSON.parse(storage.getItem(BAG_KEY) ?? 'null');
    if (!raw || !Array.isArray(raw.queue)) return { queue: [] };
    const queue = [...new Set(raw.queue.filter(isJokeIndex))] as number[];
    return isJokeIndex(raw.last) ? { queue, last: raw.last } : { queue };
  } catch {
    return { queue: [] };
  }
}

export function saveJokeBag(storage: Storage, bag: JokeBag): void {
  try {
    storage.setItem(BAG_KEY, JSON.stringify(bag));
  } catch {
    // the round just restarts after a refresh
  }
}
