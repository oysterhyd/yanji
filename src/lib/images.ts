import fs from "node:fs";
import path from "node:path";
import { IMAGES_DIR, TEMP_IMAGES_DIR } from "./db";

export function normalizeImageNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((name) => path.basename(String(name)))
    .filter(Boolean);
}

export function recordImageNames(record: { question_images?: string; answer_images?: string }): string[] {
  return [record.question_images, record.answer_images]
    .flatMap((value) => String(value ?? "").split(","))
    .map((name) => path.basename(name.trim()))
    .filter(Boolean);
}

export function resolveImagePath(name: string): string | undefined {
  const safe = path.basename(name);
  for (const dir of [IMAGES_DIR, TEMP_IMAGES_DIR]) {
    const file = path.join(dir, safe);
    if (fs.existsSync(file)) return file;
  }
  return undefined;
}

export function promoteImages(names: string[]): string[] {
  return names.map((name) => {
    const safe = path.basename(name);
    const temporary = path.join(TEMP_IMAGES_DIR, safe);
    const permanent = path.join(IMAGES_DIR, safe);
    if (fs.existsSync(temporary) && !fs.existsSync(permanent)) fs.renameSync(temporary, permanent);
    return safe;
  });
}

export function removeImages(names: string[]): void {
  for (const name of names) {
    const safe = path.basename(name);
    for (const dir of [IMAGES_DIR, TEMP_IMAGES_DIR]) {
      const file = path.join(dir, safe);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }
}

export function removeExpiredTemporaryImages(maxAgeMs = 24 * 60 * 60 * 1000): void {
  const cutoff = Date.now() - maxAgeMs;
  if (!fs.existsSync(TEMP_IMAGES_DIR)) return;
  for (const entry of fs.readdirSync(TEMP_IMAGES_DIR, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = path.join(TEMP_IMAGES_DIR, entry.name);
    if (fs.statSync(file).mtimeMs < cutoff) fs.unlinkSync(file);
  }
}
