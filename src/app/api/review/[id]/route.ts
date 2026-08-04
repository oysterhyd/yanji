import { NextRequest } from "next/server";
import { getRecord, recordReview, saveReviewState } from "@/lib/db";
import { GRADE, sm2 } from "@/lib/sm2";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const VALID_GRADES = new Set(Object.values(GRADE));

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const recordId = Number(id);
  const body = await req.json().catch(() => null);
  const grade = Number(body?.grade) as 2 | 3 | 4 | 5;
  if (!recordId || !VALID_GRADES.has(grade)) return Response.json({ error: "grade 无效" }, { status: 400 });

  const record = getRecord(recordId);
  if (!record) return Response.json({ error: "记录不存在" }, { status: 404 });

  const state = sm2(
    { ease: record.ease, interval: record.interval, reps: record.reps, lapses: record.lapses, due_date: record.due_date },
    grade
  );
  saveReviewState(recordId, state);
  recordReview(recordId, grade);
  return Response.json(state);
}
