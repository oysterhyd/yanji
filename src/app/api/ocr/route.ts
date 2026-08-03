import { NextRequest } from "next/server";
import { ocrImages } from "@/lib/ocr";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const images: string[] = Array.isArray(body?.images) ? body.images.filter((x: unknown) => typeof x === "string") : [];
  const subject = String(body?.subject ?? "math");
  const kind = body?.kind;
  if (!["math", "cs408"].includes(subject)) return Response.json({ error: "subject 必须是 math 或 cs408" }, { status: 400 });
  if (kind !== "question" && kind !== "answer") {
    return Response.json({ error: "kind 必须是 question 或 answer" }, { status: 400 });
  }
  try {
    const result = await ocrImages(images, subject, kind);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "识别失败" }, { status: 500 });
  }
}
