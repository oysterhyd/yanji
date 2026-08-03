import { describe, expect, it } from "vitest";
import { buildPrompt } from "./ocr";

describe("buildPrompt", () => {
  it("keeps question OCR transcription-only", () => {
    const prompt = buildPrompt("math", "question");
    expect(prompt).toContain("绝对不要解题");
    expect(prompt).toContain("不要补全或输出答案与解析");
    expect(prompt).toContain('{"content"');
    expect(prompt).not.toContain('"answer"');
  });

  it("keeps answer OCR faithful to the uploaded material", () => {
    const prompt = buildPrompt("cs408", "answer");
    expect(prompt).toContain("只转写图片中已有的答案与解析");
    expect(prompt).toContain("不自行补充解法");
    expect(prompt).toContain("计算机专业基础综合(408)");
  });
});
