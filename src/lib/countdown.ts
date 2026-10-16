// 31 Oct 2026, 17:00 Israel time. DST ends on 25 Oct, so Israel is UTC+2 that day.
// The explicit offset keeps the countdown right on any phone, in any timezone.
export const HALLOWEEN_START = new Date('2026-10-31T17:00:00+02:00');

export interface TimeLeft {
  done: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function timeLeft(now: Date, target: Date = HALLOWEEN_START): TimeLeft {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return { done: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  // Round up so the last second shows "1", not "0", before we start.
  const total = Math.ceil(ms / 1000);
  return {
    done: false,
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}
