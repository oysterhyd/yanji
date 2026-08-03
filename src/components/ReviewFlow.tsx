"use client";

import Image from "next/image";
import { useState } from "react";
import { CheckCircle2, Eye, RotateCcw } from "lucide-react";
import { RecordWithReview } from "@/lib/db";
import { GRADE } from "@/lib/sm2";
import { SUBJECT_LABEL } from "@/lib/constants";
import MathView from "./MathView";

function ImageStrip({ value, label }: { value: string; label: string }) {
  const images = value.split(",").filter(Boolean);
  if (images.length === 0) return null;
  return (
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {images.map((name) => (
        <a key={name} href={`/api/images/${name}`} target="_blank" rel="noreferrer" className="relative aspect-[4/3] overflow-hidden rounded-lg border border-[var(--line)]">
          <Image src={`/api/images/${name}`} alt={label} fill sizes="240px" unoptimized className="object-cover" />
        </a>
      ))}
    </div>
  );
}

export default function ReviewFlow({ initial }: { initial: RecordWithReview[] }) {
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const record = initial[idx];

  const grade = async (value: number) => {
    if (!record || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/review/${record.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: value }),
      });
      if (!response.ok) throw new Error("复习结果保存失败");
      setIdx((current) => current + 1);
      setRevealed(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "复习结果保存失败");
    } finally {
      setBusy(false);
    }
  };

  if (initial.length === 0) {
    return (
      <div className="page-shell">
        <header className="border-b border-[var(--line)] pb-6"><h1 className="page-title">今日复习</h1><p className="page-description">按计划回看已经收录的错题。</p></header>
        <div className="grid min-h-[58vh] place-items-center text-center">
          <div><CheckCircle2 className="mx-auto text-[var(--accent)]" size={38} strokeWidth={1.4} /><h2 className="mt-4 text-lg font-semibold">今天没有待复习的错题</h2><p className="mt-2 text-sm text-[var(--muted)]">新录入的错题会在次日进入复习队列。</p></div>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="page-shell">
        <header className="border-b border-[var(--line)] pb-6"><h1 className="page-title">今日复习</h1></header>
        <div className="grid min-h-[58vh] place-items-center text-center">
          <div><CheckCircle2 className="mx-auto text-[var(--accent)]" size={38} strokeWidth={1.4} /><h2 className="mt-4 text-lg font-semibold">今日复习完成</h2><p className="mt-2 text-sm text-[var(--muted)]">共完成 {initial.length} 道错题。</p></div>
        </div>
      </div>
    );
  }

  const grades = [
    { value: GRADE.FORGOT, label: "忘记了", note: "重新开始", tone: "text-red-700 dark:text-red-300" },
    { value: GRADE.HARD, label: "困难", note: "缩短间隔", tone: "text-amber-700 dark:text-amber-300" },
    { value: GRADE.GOOD, label: "良好", note: "正常安排", tone: "text-[var(--accent)]" },
    { value: GRADE.EASY, label: "简单", note: "延长间隔", tone: "text-sky-700 dark:text-sky-300" },
  ];
  const progress = (idx / initial.length) * 100;

  return (
    <div className="page-shell">
      <header className="border-b border-[var(--line)] pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 className="page-title">今日复习</h1><p className="page-description">先独立思考，再揭晓答案并评价掌握程度。</p></div>
          <div className="text-sm text-[var(--muted)]">第 <span className="font-semibold text-[var(--foreground)]">{idx + 1}</span> / {initial.length} 题</div>
        </div>
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-[var(--line)]"><div className="h-full bg-[var(--accent)] transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
      </header>

      <div className="mx-auto max-w-5xl pt-8">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs"><span className="font-semibold text-[var(--accent)]">{SUBJECT_LABEL[record.subject]}</span><span className="text-[var(--muted)]">{record.category || "未分类"}</span>{record.source && <span className="ml-auto text-[var(--muted)]">{record.source}</span>}</div>
        <section className="border-y border-[var(--line)] bg-[var(--surface)] px-5 py-7 sm:px-8">
          <div className="field-label">题目</div>
          <MathView content={record.question} className="text-[16px]" />
          <ImageStrip value={record.question_images || record.image} label="题目原图" />
        </section>

        {!revealed ? (
          <button type="button" onClick={() => setRevealed(true)} className="primary-button mt-5 w-full py-3"><Eye size={16} />显示答案与解析</button>
        ) : (
          <div className="mt-6 animate-[page-in_180ms_ease-out_both]">
            <section className="border-y border-[var(--line)] bg-[var(--surface)] px-5 py-7 sm:px-8">
              <div className="field-label">答案与解析</div>
              {record.answer ? <MathView content={record.answer} /> : <p className="text-sm text-[var(--muted)]">这道错题尚未录入答案。</p>}
              <ImageStrip value={record.answer_images} label="答案原图" />
              {record.my_mistake && <div className="mt-6 border-l-2 border-[var(--accent)] pl-4 text-sm leading-6"><span className="text-xs font-semibold text-[var(--muted)]">上次错因</span><p className="mt-1">{record.my_mistake}</p></div>}
            </section>

            <div className="mt-6">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><RotateCcw size={15} />这次掌握得怎么样？</div>
              <div className="grid gap-2 sm:grid-cols-4">
                {grades.map((item) => (
                  <button key={item.value} type="button" onClick={() => void grade(item.value)} disabled={busy} className="secondary-button min-h-16 flex-col items-start px-4 text-left">
                    <span className={`text-sm font-semibold ${item.tone}`}>{item.label}</span>
                    <span className="text-[11px] font-normal text-[var(--muted)]">{item.note}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}
      </div>
    </div>
  );
}
