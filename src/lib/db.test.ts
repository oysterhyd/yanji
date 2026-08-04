import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  closeDb,
  countDue,
  countMastered,
  createRecord,
  deleteRecord,
  getRecord,
  initialReviewDueDate,
  recordReview,
  recordStats,
  reviewTrend,
  updateRecord,
} from "./db";

function makeRecord(overrides: Record<string, unknown> = {}) {
  return createRecord({
    subject: "math",
    category: "高数",
    tags: "极限",
    source: "660 题",
    question: "求 $\\lim_{x \\to 0} \\frac{\\sin x}{x}$。",
    answer: "答案为 1。",
    my_mistake: "洛必达误用",
    ...overrides,
  } as never);
}

describe("db", () => {
  beforeEach(() => {
    process.env.DB_PATH = ":memory:";
    closeDb();
  });

  afterEach(() => {
    closeDb();
    delete process.env.DB_PATH;
  });

  describe("initialReviewDueDate", () => {
    it("schedules the first review one day after creation", () => {
      const createdAt = Date.UTC(2026, 7, 3, 9, 30);
      expect(initialReviewDueDate(createdAt)).toBe(createdAt + 24 * 60 * 60 * 1000);
    });
  });

  describe("record images in the child table", () => {
    it("persists question and answer image names by position", () => {
      const record = makeRecord({ question_images: "q1.png,q2.png", answer_images: "a1.png" });
      expect(record.question_images).toBe("q1.png,q2.png");
      expect(record.answer_images).toBe("a1.png");
      expect(getRecord(record.id)?.question_images).toBe("q1.png,q2.png");
    });

    it("replaces image lists on update", () => {
      const record = makeRecord({ question_images: "q1.png,q2.png" });
      const updated = updateRecord(record.id, { question_images: "q3.png" });
      expect(updated?.question_images).toBe("q3.png");
      expect(updated?.answer_images).toBe("");
    });

    it("leaves image references untouched when omitted on update", () => {
      const record = makeRecord({ question_images: "q1.png", answer_images: "a1.png" });
      const updated = updateRecord(record.id, { source: "新来源" });
      expect(updated?.question_images).toBe("q1.png");
      expect(updated?.answer_images).toBe("a1.png");
    });
  });

  describe("deletion", () => {
    it("removes the record and leaves siblings intact", () => {
      const first = makeRecord();
      const second = makeRecord({ subject: "cs408", category: "数据结构" });
      deleteRecord(first.id);
      expect(getRecord(first.id)).toBeUndefined();
      expect(getRecord(second.id)).toBeDefined();
      expect(countDue()).toBe(0);
    });
  });

  describe("stats", () => {
    it("aggregates by subject and category", () => {
      makeRecord({ category: "高数" });
      makeRecord({ category: "线代" });
      makeRecord({ subject: "cs408", category: "数据结构" });
      const stats = recordStats(Date.now() + 30 * 86400000);
      expect(stats).toHaveLength(3);
      const mathRows = stats.filter((item) => item.subject === "math");
      expect(mathRows).toHaveLength(2);
      const cs = stats.find((item) => item.subject === "cs408");
      expect(cs?.total).toBe(1);
      expect(cs?.category).toBe("数据结构");
    });

    it("counts due and mastered records", () => {
      makeRecord();
      expect(countDue(Date.now() + 2 * 86400000)).toBe(1);
      expect(countMastered()).toBe(0);
    });
  });

  describe("review trend", () => {
    it("tracks daily review counts and forgotten grades", () => {
      const record = makeRecord();
      recordReview(record.id, 4, Date.now());
      recordReview(record.id, 2, Date.now());
      const trend = reviewTrend(7);
      expect(trend.length).toBeGreaterThanOrEqual(1);
      const today = trend[trend.length - 1];
      expect(today.reviews).toBe(2);
      expect(today.forgotten).toBe(1);
    });
  });
});
