import { NextRequest } from "next/server";
import { deleteRecord, getRecord, updateRecord } from "@/lib/db";
import { normalizeImageNames, promoteImages, recordImageNames, removeImages } from "@/lib/images";

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
  const questionImages = body.question_images === undefined
    ? undefined
    : promoteImages(normalizeImageNames(body.question_images));
  const answerImages = body.answer_images === undefined
    ? undefined
    : promoteImages(normalizeImageNames(body.answer_images));
  const updated = updateRecord(recordId, {
    subject: body.subject,
    category: body.category,
    tags: body.tags,
    source: body.source,
    question: body.question,
    answer: body.answer,
    my_mistake: body.my_mistake,
    question_images: questionImages?.join(","),
    answer_images: answerImages?.join(","),
  });
  if (!updated) return Response.json({ error: "记录不存在" }, { status: 404 });
  const previousImages = [...current.question_images.split(","), ...current.answer_images.split(",")].filter(Boolean);
  const nextImages = new Set([...updated.question_images.split(","), ...updated.answer_images.split(",")].filter(Boolean));
  removeImages(previousImages.filter((name) => !nextImages.has(name)));
  return Response.json(updated);
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
