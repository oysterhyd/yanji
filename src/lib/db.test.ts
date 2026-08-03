import { describe, expect, it } from "vitest";
import { initialReviewDueDate } from "./db";

describe("initialReviewDueDate", () => {
  it("schedules the first review one day after creation", () => {
    const createdAt = Date.UTC(2026, 7, 3, 9, 30);
    expect(initialReviewDueDate(createdAt)).toBe(createdAt + 24 * 60 * 60 * 1000);
  });
});
