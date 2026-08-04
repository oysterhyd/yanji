import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { exportAll, IMAGES_DIR, importAll } from "@/lib/db";
import { recordImageNames, removeImages } from "@/lib/images";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.records)) {
    return Response.json({ error: "备份文件格式不正确" }, { status: 400 });
  }
  if (!body.records.every((record: unknown) => record && typeof record === "object" && typeof (record as { id?: unknown }).id === "number")) {
    return Response.json({ error: "备份文件缺少有效的记录数据" }, { status: 400 });
  }
  try {
    const previous = exportAll();
    const previousNames = previous.records.flatMap(recordImageNames);
    const images: Record<string, string> = body.images ?? {};
    for (const [name, data] of Object.entries(images)) {
      if (typeof data !== "string") continue;
      fs.writeFileSync(path.join(IMAGES_DIR, path.basename(name)), Buffer.from(data, "base64"));
    }
    importAll(body);
    removeImages(previousNames.filter((name) => !(name in images)));
    return Response.json({ ok: true, count: body.records.length });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "导入失败" }, { status: 500 });
  }
}
