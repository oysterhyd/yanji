import { NextRequest } from "next/server";
import { normalizeImageNames, removeImages } from "@/lib/images";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const images = normalizeImageNames(body?.images);
  removeImages(images);
  return Response.json({ ok: true });
}
