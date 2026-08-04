import { NextRequest } from "next/server";
import { deleteRecord, getRecord, updateRecord } from "@/lib/db";
import { normalizeImageNames, promoteImages, recordImageNames, removeImages } from "@/lib/images";
import { MAX_SHORT, MAX_TEXT, ValidationError, validateText } from "@/lib/validate";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const recordId = Number(id);
  const body = await req.json().catch(() => null);
  if (!body || !recordId) return Response.json({ error: "参数错误" }, { status: 400 });
  if (body.subject !== undefined && !["math", "cs408"].includes(body.subject as string)) {
    return Response.json({ error: "subject 必须是 math 或 cs408" }, { status: 400 });
  }
  const current = getRecord(recordId);
  if (!current) return Response.json({ error: "记录不存在" }, { status: 404 });
  try {
    const question = body.question === undefined ? undefined : validateText(body.question, MAX_TEXT, "题目内容");
    if (question !== undefined && !question.trim()) throw new ValidationError("题目内容不能为空");
    const answer = body.answer === undefined ? undefined : validateText(body.answer, MAX_TEXT, "答案内容");
    const myMistake = body.my_mistake === undefined ? undefined : validateText(body.my_mistake, MAX_TEXT, "错因");
    const category = body.category === undefined ? undefined : validateText(body.category, MAX_SHORT, "分类");
    const tags = body.tags === undefined ? undefined : validateText(body.tags, MAX_SHORT, "标签");
    const source = body.source === undefined ? undefined : validateText(body.source, MAX_SHORT, "来源");
    const questionImages = body.question_images === undefined
      ? undefined
      : promoteImages(normalizeImageNames(body.question_images));
    const answerImages = body.answer_images === undefined
      ? undefined
      : promoteImages(normalizeImageNames(body.answer_images));
    const updated = updateRecord(recordId, {
      subject: body.subject,
      category,
      tags,
      source,
      question,
      answer,
      my_mistake: myMistake,
      question_images: questionImages?.join(","),
      answer_images: answerImages?.join(","),
    });
    if (!updated) return Response.json({ error: "记录不存在" }, { status: 404 });
    const previousImages = [...current.question_images.split(","), ...current.answer_images.split(",")].filter(Boolean);
    const nextImages = new Set([...updated.question_images.split(","), ...updated.answer_images.split(",")].filter(Boolean));
    removeImages(previousImages.filter((name) => !nextImages.has(name)));
    return Response.json(updated);
  } catch (error) {
    if (error instanceof ValidationError) return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const recordId = Number(id);
  const record = getRecord(recordId);
  if (!record) return Response.json({ error: "记录不存在" }, { status: 404 });
  deleteRecord(recordId);
  removeImages(recordImageNames(record));
  return Response.json({ ok: true });
}
