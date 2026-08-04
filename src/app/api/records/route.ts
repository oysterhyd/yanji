import { NextRequest } from "next/server";
import { createRecord, listRecords, Subject } from "@/lib/db";
import { normalizeImageNames, promoteImages } from "@/lib/images";
import { MAX_SHORT, MAX_TEXT, ValidationError, validateText } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(listRecords());
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !["math", "cs408"].includes(body.subject as string)) {
    return Response.json({ error: "subject 必须是 math 或 cs408" }, { status: 400 });
  }
  try {
    const question = validateText(body.question, MAX_TEXT, "题目内容");
    if (!question.trim()) throw new ValidationError("题目内容不能为空");
    const answer = validateText(body.answer, MAX_TEXT, "答案内容");
    const myMistake = validateText(body.my_mistake, MAX_TEXT, "错因");
    const category = validateText(body.category, MAX_SHORT, "分类");
    const tags = validateText(body.tags, MAX_SHORT, "标签");
    const source = validateText(body.source, MAX_SHORT, "来源");
    const questionImages = promoteImages(normalizeImageNames(body.question_images));
    const answerImages = promoteImages(normalizeImageNames(body.answer_images));
    const record = createRecord({
      subject: body.subject as Subject,
      category,
      tags,
      source,
      question,
      answer,
      my_mistake: myMistake,
      question_images: questionImages.join(","),
      answer_images: answerImages.join(","),
    });
    return Response.json(record, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
