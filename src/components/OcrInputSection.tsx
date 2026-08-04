"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { FileImage, Plus, ScanText, Trash2, UploadCloud } from "lucide-react";

export interface SavedImage {
  name: string;
  url: string;
  temporary?: boolean;
}

interface PendingImage {
  id: string;
  file: File;
  url: string;
}

const MAX_COMPRESS_BYTES = 2 * 1024 * 1024;
const MAX_SIDE = 2048;

async function compressImage(file: File): Promise<File> {
  if (file.size <= MAX_COMPRESS_BYTES) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("图片压缩失败"))), "image/jpeg", 0.85)
  );
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

export default function OcrInputSection({
  kind,
  subject,
  value,
  onChange,
  images,
  onImagesChange,
}: {
  kind: "question" | "answer";
  subject: string;
  value: string;
  onChange: (value: string) => void;
  images: SavedImage[];
  onImagesChange: (images: SavedImage[]) => void;
}) {
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [candidate, setCandidate] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const title = kind === "question" ? "题目图片" : "答案图片";
  const description = kind === "question"
    ? "只转写题干、选项和题图说明，不会生成答案。"
    : "只转写图片中已有的答案与解析，不会补充解法。";

  const addFiles = (files: File[]) => {
    setError("");
    const room = Math.max(0, 5 - images.length - pending.length);
    if (room === 0) {
      setError(`${title}最多上传 5 张`);
      return;
    }
    const accepted = files.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type)).slice(0, room);
    if (accepted.length !== files.slice(0, room).length) setError("仅支持 JPG、PNG 和 WebP 图片");
    setPending((current) => [
      ...current,
      ...accepted.map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) })),
    ]);
  };

  const runOcr = async () => {
    if (pending.length === 0 || loading) return;
    setLoading(true);
    setError("");
    try {
      const compressed = await Promise.all(pending.map((item) => compressImage(item.file)));
      const form = new FormData();
      compressed.forEach((file) => form.append("files", file, file.name));
      const uploadResponse = await fetch("/api/upload", { method: "POST", body: form });
      const uploadBody = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadBody.error ?? "上传失败");

      const uploaded = (uploadBody.images as SavedImage[]).map((item) => ({ ...item, temporary: true }));
      const ocrResponse = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: uploaded.map((item) => item.name), subject, kind }),
      });
      const ocrBody = await ocrResponse.json();
      if (!ocrResponse.ok) throw new Error(ocrBody.error ?? "识别失败");

      onImagesChange([...images, ...uploaded]);
      pending.forEach((item) => URL.revokeObjectURL(item.url));
      setPending([]);
      const content = String(ocrBody.content ?? "").trim();
      if (!value.trim()) onChange(content);
      else setCandidate(content);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "识别失败");
    } finally {
      setLoading(false);
    }
  };

  const removePending = (id: string) => {
    setPending((current) => current.filter((item) => {
      if (item.id === id) URL.revokeObjectURL(item.url);
      return item.id !== id;
    }));
  };

  const removeSaved = async (name: string) => {
    const image = images.find((item) => item.name === name);
    onImagesChange(images.filter((item) => item.name !== name));
    if (image?.temporary) {
      await fetch("/api/uploads/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: [name] }),
      });
    }
  };

  return (
    <section className="border-t border-[var(--line)] pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p>
        </div>
        <span className="shrink-0 text-xs text-[var(--muted)]">{images.length + pending.length}/5</span>
      </div>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(Array.from(event.dataTransfer.files));
        }}
        className={`mt-4 grid w-full place-items-center rounded-xl border border-dashed px-5 py-7 text-center transition-colors ${dragging ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line-strong)] bg-[var(--surface)] hover:bg-[var(--surface-strong)]"}`}
      >
        <UploadCloud size={24} strokeWidth={1.5} className="text-[var(--accent)]" />
        <span className="mt-2 text-sm font-medium">拖入图片或点击选择</span>
        <span className="mt-1 text-xs text-[var(--muted)]">JPG、PNG、WebP · 单张不超过 10 MB</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(event) => {
          addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />

      {(pending.length > 0 || images.length > 0) && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {images.map((image) => (
            <div key={image.name} className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]">
              <Image src={image.url} alt={`${title}预览`} fill sizes="120px" unoptimized className="object-cover" />
              <button type="button" onClick={() => void removeSaved(image.name)} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-md bg-black/65 text-white opacity-0 transition-opacity group-hover:opacity-100" aria-label="删除图片"><Trash2 size={13} /></button>
            </div>
          ))}
          {pending.map((image) => (
            <div key={image.id} className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--accent)] bg-[var(--surface)]">
              <Image src={image.url} alt={`${title}待上传预览`} fill sizes="120px" unoptimized className="object-cover" />
              <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] text-white">待识别</span>
              <button type="button" onClick={() => removePending(image.id)} className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-md bg-black/65 text-white opacity-0 transition-opacity group-hover:opacity-100" aria-label="移除图片"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={() => void runOcr()} disabled={pending.length === 0 || loading} className="secondary-button mt-3 w-full">
        {loading ? <><ScanText size={15} className="animate-pulse" />正在识别…</> : <><ScanText size={15} />识别{kind === "question" ? "题目" : "答案"}图片</>}
      </button>

      {error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}

      {candidate && (
        <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold"><FileImage size={14} />识别结果待处理</div>
          <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap text-xs leading-5 text-[var(--muted)]">{candidate}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => { onChange(`${value.trim()}\n\n${candidate}`); setCandidate(""); }} className="primary-button"><Plus size={14} />追加</button>
            <button type="button" onClick={() => { onChange(candidate); setCandidate(""); }} className="secondary-button">替换原内容</button>
            <button type="button" onClick={() => setCandidate("")} className="secondary-button">忽略</button>
          </div>
        </div>
      )}
    </section>
  );
}
