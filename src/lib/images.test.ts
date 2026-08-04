import { describe, expect, it } from "vitest";
import { normalizeImageNames, recordImageNames } from "./images";

describe("image name handling", () => {
  it("accepts arrays and strips path traversal", () => {
    expect(normalizeImageNames(["question.png", "../answer.webp"])).toEqual(["question.png", "answer.webp"]);
  });

  it("collects question and answer attachments for deletion", () => {
    expect(recordImageNames({ question_images: "q1.png,q2.png", answer_images: "a1.png" }))
      .toEqual(["q1.png", "q2.png", "a1.png"]);
  });
});
