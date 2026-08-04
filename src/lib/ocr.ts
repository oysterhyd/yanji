import fs from "node:fs";
import path from "node:path";
import { resolveImagePath } from "./images";

const API_BASE = process.env.OCR_API_BASE ?? "";
const API_KEY = process.env.OCR_API_KEY ?? "";
const MODEL = process.env.OCR_MODEL ?? "gpt-5.6-luna";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function toDataUrl(filename: string): string {
  const file = resolveImagePath(filename);
  if (!file) throw new Error(`图片不存在: ${path.basename(filename)}`);
  const ext = path.extname(filename).toLowerCase();
  const base64 = fs.readFileSync(file).toString("base64");
  return `data:${MIME[ext] ?? "image/jpeg"};base64,${base64}`;
}

export type OcrKind = "question" | "answer";

export function buildPrompt(subject: string, kind: OcrKind): string {
  const topic = subject === "cs408" ? "计算机专业基础综合(408)" : "考研数学";
  const target = kind === "question" ? "题目" : "答案与解析";
  const fidelity = kind === "question"
    ? "只转写图片中已有的题干、选项和题图说明。绝对不要解题或推导，不要补全或输出答案与解析。"
    : "只转写图片中已有的答案与解析。保留原步骤和结论，不润色、不纠错、不自行补充解法。";
  return [
    `你是考研错题转写助手。请识别图片中的${topic}${target}，只输出严格的 JSON：`,
    `{"content": "转写后的 Markdown + LaTeX 内容"}`,
    "要求：",
    `1. ${fidelity}`,
    "2. 中文文字原样保留，不要翻译；只修复明显由版面造成的断行",
    "3. 所有数学符号、公式、上下标转成 LaTeX；行内使用 $...$，独立公式使用 $$...$$",
    "4. aligned、cases、matrix 等多行环境必须放在 $$...$$ 内",
    "5. 普通表格尽量转成 Markdown 表格；无法可靠转写的图形写成【题图见原图】，不要猜测图中信息",
    "6. 模糊或无法辨认的内容写成【此处需人工核对】，不要编造",
    "7. 只输出 JSON 本身，不要 Markdown 代码块标记，不要任何解释文字",
  ].join("\n");
}

function extractJson(text: string): Record<string, unknown> {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned);
}

export async function ocrImages(filenames: string[], subject: string, kind: OcrKind): Promise<{ content: string }> {
  if (!API_BASE || !API_KEY) throw new Error("OCR_API_BASE / OCR_API_KEY 未配置");
  if (filenames.length === 0) throw new Error("没有可识别的图片");

  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildPrompt(subject, kind) },
            ...filenames.map((f) => ({ type: "image_url", image_url: { url: toDataUrl(f) } })),
          ],
        },
      ],
    }),
  }).catch(() => {
    throw new Error("识别超时，请稍后重试或减少图片数量");
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`识别接口 ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("识别接口返回为空");
  const parsed = extractJson(content);
  return { content: String(parsed.content ?? "") };
}
