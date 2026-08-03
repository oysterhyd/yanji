import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MathView, { normalizeMathBlocks } from "./MathView";

describe("MathView", () => {
  it("renders inline math without a display container", () => {
    const html = renderToStaticMarkup(<MathView content="当 $x \\to 0$ 时求极限。" />);
    expect(html).toContain("katex");
    expect(html).not.toContain("katex-display");
  });

  it("renders display and multiline environments", () => {
    const html = renderToStaticMarkup(
      <MathView content={"$$\\begin{aligned}a&=b+c\\\\d&=e+f\\end{aligned}$$"} />
    );
    expect(html).toContain("katex-display");
    expect(html).toContain("aligned");
  });

  it("does not rewrite dollar pairs inside fenced code", () => {
    expect(normalizeMathBlocks("```txt\n$$not math$$\n```\n\n$$x^2$$")).toContain("```txt\n$$not math$$\n```");
  });

  it("renders fenced code and markdown tables", () => {
    const html = renderToStaticMarkup(<MathView content={"```c\nint x = 1;\n```\n\n| A | B |\n| - | - |\n| 1 | 2 |"} />);
    expect(html).toContain("<pre>");
    expect(html).toContain("markdown-table-wrap");
  });
});
