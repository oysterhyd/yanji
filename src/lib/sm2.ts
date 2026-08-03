export interface Sm2State {
  ease: number;
  interval: number;
  reps: number;
  lapses: number;
  due_date: number;
}

export const GRADE = {
  FORGOT: 2,
  HARD: 3,
  GOOD: 4,
  EASY: 5,
} as const;

export function sm2(state: Sm2State, quality: number, now = Date.now()): Sm2State {
  let { ease, interval, reps, lapses } = state;
  if (quality < 3) {
    reps = 0;
    interval = 1;
    ease = Math.max(1.3, ease - 0.2);
    lapses += 1;
  } else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * ease);
    ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    reps += 1;
  }
  return { ease, interval, reps, lapses, due_date: now + interval * 86400000 };
}
