import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { resolveImagePath } from "@/lib/images";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

type Ctx = { params: Promise<{ name: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { name } = await ctx.params;
  const safe = path.basename(name);
  const file = resolveImagePath(safe);
  if (!file) return new Response("Not Found", { status: 404 });
  const ext = path.extname(safe).toLowerCase();
  return new Response(fs.readFileSync(file), {
    headers: { "Content-Type": MIME[ext] ?? "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
