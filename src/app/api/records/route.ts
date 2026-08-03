import { NextRequest } from "next/server";
import { createRecord, listRecords, Subject } from "@/lib/db";
import { normalizeImageNames, promoteImages } from "@/lib/images";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(listRecords());
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !["math", "cs408"].includes(body.subject as string)) {
    return Response.json({ error: "subject 必须是 math 或 cs408" }, { status: 400 });
  }
  if (typeof body.question !== "string" || !body.question.trim()) {
    return Response.json({ error: "题目内容不能为空" }, { status: 400 });
  }
  const questionImages = promoteImages(normalizeImageNames(body.question_images));
  const answerImages = promoteImages(normalizeImageNames(body.answer_images));
  const record = createRecord({
    subject: body.subject as Subject,
    category: String(body.category ?? ""),
    tags: String(body.tags ?? ""),
    source: String(body.source ?? ""),
    question: body.question,
    answer: String(body.answer ?? ""),
    my_mistake: String(body.my_mistake ?? ""),
    question_images: questionImages.join(","),
    answer_images: answerImages.join(","),
  });
  return Response.json(record, { status: 201 });
}
