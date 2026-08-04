import fs from "node:fs";
import { exportAll } from "@/lib/db";
import { recordImageNames, resolveImagePath } from "@/lib/images";

export const dynamic = "force-dynamic";

export async function POST() {
  const data = exportAll();
  const images: Record<string, string> = {};
  for (const record of data.records) {
    for (const name of recordImageNames(record)) {
      if (images[name]) continue;
      const file = resolveImagePath(name);
      if (file) images[name] = fs.readFileSync(file).toString("base64");
    }
  }
  return Response.json({ ...data, images });
}
