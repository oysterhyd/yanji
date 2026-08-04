import { describe, expect, it } from "vitest";
import { GRADE, sm2, Sm2State } from "./sm2";

const NOW = Date.UTC(2026, 7, 3, 9, 30);
const DAY = 86400000;

const fresh = (overrides: Partial<Sm2State> = {}): Sm2State => ({
  ease: 2.5,
  interval: 0,
  reps: 0,
  lapses: 0,
  due_date: NOW,
  ...overrides,
});

describe("sm2", () => {
  it("schedules the first successful review one day ahead", () => {
    const next = sm2(fresh(), GRADE.GOOD, NOW);
    expect(next.interval).toBe(1);
    expect(next.reps).toBe(1);
    expect(next.lapses).toBe(0);
    expect(next.due_date).toBe(NOW + DAY);
  });

  it("grows the interval via ease after repeated success", () => {
    const afterFirst = sm2(fresh(), GRADE.GOOD, NOW);
    const afterSecond = sm2(afterFirst, GRADE.GOOD, afterFirst.due_date);
    expect(afterSecond.interval).toBe(6);
    const afterThird = sm2(afterSecond, GRADE.GOOD, afterSecond.due_date);
    expect(afterThird.interval).toBe(Math.round(6 * 2.5));
  });

  it("resets progress on a forgotten card and shortens the interval", () => {
    const state = fresh({ reps: 5, interval: 30, ease: 2.5 });
    const next = sm2(state, GRADE.FORGOT, NOW);
    expect(next.reps).toBe(0);
    expect(next.interval).toBe(1);
    expect(next.lapses).toBe(1);
    expect(next.ease).toBe(2.3);
    expect(next.due_date).toBe(NOW + DAY);
  });

  it("never drops ease below the floor", () => {
    let state = fresh();
    for (let i = 0; i < 20; i += 1) {
      state = sm2(state, GRADE.FORGOT, NOW);
    }
    expect(state.ease).toBe(1.3);
  });
});
