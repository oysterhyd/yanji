"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, DatabaseBackup, Download, RefreshCw, Upload } from "lucide-react";

export default function BackupPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const exportData = async () => {
    setExporting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/backup/export", { method: "POST" });
      if (!response.ok) throw new Error("导出失败，请重试");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `yanji-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("备份文件已下载，请妥善保存。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "导出失败");
    } finally {
      setExporting(false);
    }
  };

  const importData = async (file: File) => {
    if (!confirm("导入会覆盖当前全部错题、图片和复习记录，确定继续？")) return;
    setImporting(true);
    setError("");
    setMessage("");
    try {
      const text = await file.text();
      const response = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "导入失败");
      setMessage(`已导入 ${body.count} 条错题。`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "导入失败");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="page-shell">
      <header className="flex flex-col gap-5 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/" className="mb-4 inline-flex items-center gap-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"><ArrowLeft size={14} />返回错题库</Link>
          <h1 className="page-title">数据备份</h1>
          <p className="page-description">错题、图片和复习记录都在本机，请定期导出备份。</p>
        </div>
      </header>

      <div className="mx-auto grid max-w-2xl gap-4 pt-8">
        <section className="flex flex-col gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><Download size={18} /></span>
            <div>
              <h2 className="text-sm font-semibold">导出备份</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">下载包含全部错题、图片和复习记录的 JSON 文件。</p>
            </div>
          </div>
          <button type="button" onClick={() => void exportData()} disabled={exporting} className="primary-button shrink-0">
            {exporting ? <><RefreshCw size={15} className="animate-spin" />导出中…</> : <><DatabaseBackup size={15} />导出备份</>}
          </button>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><Upload size={18} /></span>
            <div>
              <h2 className="text-sm font-semibold">导入备份</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">从备份文件恢复。导入会<b>覆盖</b>当前全部数据，操作前请先导出。</p>
            </div>
          </div>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={importing} className="secondary-button shrink-0">
            {importing ? <><RefreshCw size={15} className="animate-spin" />导入中…</> : <><Upload size={15} />选择文件</>}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void importData(file);
            }}
          />
        </section>

        {message && <p className="text-sm text-[var(--accent)]">{message}</p>}
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      </div>
    </div>
  );
}
