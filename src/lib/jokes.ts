// Popped at random every time a kid marks "היינו כאן".
export const JOKES = [
  'אני לא אוכל יותר מדי ממתקים. אני רק בודק אם זה טעים 🍬🧐',
  'אומרים שכסף לא קונה אושר. כנראה שלא קנו איתו מספיק שוקולד 🍫💸',
  'אני לא משאיר פירורים. אני מכבד את הממתק עד הסוף 🍪😌',
  'אין דבר כזה יותר מדי ממתקים. יש רק מעט מדי שקיות 🛍️🍭',
  'אם תראו אותי עם שקית ריקה - לא ראיתם כלום... 🤫👀',
  'שקט, אני סופר סוכריות 🤓🍬',
] as const;

/** Random joke index, never the same as the previous one. */
export function pickJoke(random: () => number = Math.random, previous?: number): number {
  if (previous === undefined || JOKES.length < 2) return Math.floor(random() * JOKES.length);
  // Pick among the other jokes, then shift past the previous one.
  const i = Math.floor(random() * (JOKES.length - 1));
  return i >= previous ? i + 1 : i;
}
