"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpenCheck, ChevronLeft, ChevronRight, Filter, Plus, Search, X } from "lucide-react";
import { RecordSummary } from "@/lib/db";
import { CATEGORIES, formatDate, SUBJECT_LABEL } from "@/lib/constants";
import MathView from "./MathView";

interface RecordListProps {
  records: RecordSummary[];
  total: number;
  page: number;
  totalPages: number;
  dueCount: number;
  mastered: number;
  now: number;
  subject: string;
  category: string;
  tag: string;
  kw: string;
  tags: string[];
}

export default function RecordList({
  records,
  total,
  page,
  totalPages,
  dueCount,
  mastered,
  now,
  subject,
  category,
  tag,
  kw,
  tags,
}: RecordListProps) {
  const router = useRouter();
  const [kwInput, setKwInput] = useState(kw);
  const [prevKw, setPrevKw] = useState(kw);

  if (prevKw !== kw) {
    setPrevKw(kw);
    setKwInput(kw);
  }

  const buildHref = (patch: Partial<{ subject: string; category: string; tag: string; kw: string; page: number }>) => {
    const next = { subject, category, tag, kw: kwInput, page, ...patch };
    const sp = new URLSearchParams();
    if (next.subject) sp.set("subject", next.subject);
    if (next.category) sp.set("category", next.category);
    if (next.tag) sp.set("tag", next.tag);
    if (next.kw) sp.set("kw", next.kw);
    if (next.page > 1) sp.set("page", String(next.page));
    const query = sp.toString();
    return query ? `/?${query}` : "/";
  };

  const update = (patch: Partial<{ subject: string; category: string; tag: string; kw: string; page: number }>) => {
    router.replace(buildHref(patch));
  };

  useEffect(() => {
    if (kwInput === kw) return;
    const timer = setTimeout(() => update({ kw: kwInput, page: 1 }), 300);
    return () => clearTimeout(timer);
  });

  const hasFilters = Boolean(subject || category || tag || kw);
  const resetFilters = () => {
    setKwInput("");
    update({ subject: "", category: "", tag: "", kw: "", page: 1 });
  };

  return (
    <div className="page-shell">
      <header className="flex flex-col gap-5 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-[var(--accent)]">STUDY ARCHIVE</p>
          <h1 className="page-title">错题库</h1>
          <p className="page-description">整理题目、核对公式，并安排下一次复习。</p>
        </div>
        <Link href="/new" className="primary-button self-start sm:self-auto"><Plus size={16} />新增错题</Link>
      </header>

      <section className="grid grid-cols-3 border-b border-[var(--line)] py-5">
        {[
          { label: "全部错题", value: total },
          { label: "今日待复习", value: dueCount },
          { label: "已掌握", value: mastered },
        ].map((item, index) => (
          <div key={item.label} className={`px-3 py-2 sm:px-6 ${index === 0 ? "pl-0" : "border-l border-[var(--line)]"}`}>
            <div className="text-2xl font-semibold tracking-tight">{item.value}</div>
            <div className="mt-1 text-xs text-[var(--muted)]">{item.label}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-8 pt-7 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold"><Filter size={15} />筛选</span>
            {hasFilters && <button type="button" onClick={resetFilters} className="text-xs text-[var(--accent)]">清除</button>}
          </div>
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={15} />
            <input value={kwInput} onChange={(event) => setKwInput(event.target.value)} placeholder="搜索题目或来源" className="field-control pl-9" />
          </label>
          <div>
            <label className="field-label">科目</label>
            <select value={subject} onChange={(event) => update({ subject: event.target.value, category: "", page: 1 })} className="field-control">
              <option value="">全部科目</option>
              <option value="math">数学</option>
              <option value="cs408">408</option>
            </select>
          </div>
          <div>
            <label className="field-label">分类</label>
            <select value={category} onChange={(event) => update({ category: event.target.value, page: 1 })} className="field-control" disabled={!subject}>
              <option value="">全部分类</option>
              {subject && CATEGORIES[subject].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">标签</label>
            <select value={tag} onChange={(event) => update({ tag: event.target.value, page: 1 })} className="field-control" disabled={tags.length === 0}>
              <option value="">全部标签</option>
              {tags.map((item) => <option key={item} value={item}>#{item}</option>)}
            </select>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between text-xs text-[var(--muted)]">
            <span>共 {total} 条记录</span>
            <span className="hidden sm:inline">按录入时间倒序</span>
          </div>
          <div className="overflow-hidden border-y border-[var(--line)]">
            {records.length === 0 ? (
              <div className="grid min-h-64 place-items-center bg-[var(--surface)] px-6 text-center">
                <div>
                  <BookOpenCheck className="mx-auto text-[var(--muted)]" size={28} strokeWidth={1.5} />
                  <p className="mt-3 text-sm font-medium">没有符合条件的错题</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">调整筛选条件，或录入一道新题。</p>
                  {hasFilters && <button onClick={resetFilters} className="secondary-button mt-4"><X size={14} />清除筛选</button>}
                </div>
              </div>
            ) : records.map((record) => {
              const overdue = record.due_date > 0 && record.due_date <= now;
              return (
                <Link key={record.id} href={`/records/${record.id}`} className="group grid gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-4 transition-colors last:border-b-0 hover:bg-[var(--surface-strong)] sm:grid-cols-[128px_minmax(0,1fr)_160px_22px] sm:items-center sm:px-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-[var(--accent)]">{SUBJECT_LABEL[record.subject]}</span>
                    <span className="text-[var(--muted)]">{record.category || "未分类"}</span>
                  </div>
                  <div className="min-w-0">
                    <MathView content={record.question} className="record-summary line-clamp-2 text-sm" />
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--muted)]">
                      {record.source && <span>{record.source}</span>}
                      {record.tags.split(",").filter(Boolean).slice(0, 3).map((item) => <span key={item}>#{item.trim()}</span>)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs sm:block sm:text-right">
                    <span className={overdue ? "font-semibold text-[var(--danger)]" : "text-[var(--muted)]"}>{overdue ? "待复习" : "已安排"}</span>
                    <div className="mt-1 text-[var(--muted)]">{formatDate(record.created_at)}</div>
                  </div>
                  <ChevronRight className="hidden text-[var(--muted)] transition-transform group-hover:translate-x-1 sm:block" size={17} />
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-5 text-xs text-[var(--muted)]">
              <Link
                href={buildHref({ page: page - 1 })}
                aria-disabled={page <= 1}
                className={`inline-flex items-center gap-1 ${page <= 1 ? "pointer-events-none opacity-40" : "hover:text-[var(--foreground)]"}`}
              >
                <ChevronLeft size={14} />上一页
              </Link>
              <span>第 {page} / {totalPages} 页</span>
              <Link
                href={buildHref({ page: page + 1 })}
                aria-disabled={page >= totalPages}
                className={`inline-flex items-center gap-1 ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:text-[var(--foreground)]"}`}
              >
                下一页<ChevronRight size={14} />
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
