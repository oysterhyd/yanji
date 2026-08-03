import { NextRequest } from "next/server";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { TEMP_IMAGES_DIR } from "@/lib/db";
import { removeExpiredTemporaryImages } from "@/lib/images";

export const dynamic = "force-dynamic";

const ALLOWED = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_IMAGES = 5;
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  removeExpiredTemporaryImages();
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return Response.json({ error: "没有收到图片" }, { status: 400 });
  if (files.length > MAX_IMAGES) return Response.json({ error: `最多 ${MAX_IMAGES} 张图片` }, { status: 400 });

  const saved: { name: string; url: string }[] = [];
  for (const file of files) {
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED.has(ext)) return Response.json({ error: `不支持的格式: ${ext || file.name}` }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: `图片过大: ${file.name}` }, { status: 400 });
    const name = `${crypto.randomUUID()}${ext}`;
    await fs.writeFile(path.join(TEMP_IMAGES_DIR, name), Buffer.from(await file.arrayBuffer()));
    saved.push({ name, url: `/api/images/${name}` });
  }
  return Response.json({ images: saved });
}
