"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, Edit3, ExternalLink, Save, Trash2 } from "lucide-react";
import { RecordWithReview } from "@/lib/db";
import { CATEGORIES, formatDate, SUBJECT_LABEL, SUBJECTS } from "@/lib/constants";
import MathView from "./MathView";
import OcrInputSection, { SavedImage } from "./OcrInputSection";

function toImages(value: string): SavedImage[] {
  return value.split(",").filter(Boolean).map((name) => ({ name, url: `/api/images/${name}` }));
}

function ImageGallery({ title, images }: { title: string; images: SavedImage[] }) {
  if (images.length === 0) return null;
  return (
    <section>
      <div className="field-label">{title}</div>
      <div className="grid grid-cols-2 gap-2">
        {images.map((image) => (
          <a key={image.name} href={image.url} target="_blank" rel="noreferrer" className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]">
            <Image src={image.url} alt={title} fill sizes="160px" unoptimized className="object-cover transition-transform duration-200 group-hover:scale-[1.02]" />
            <span className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-md bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"><ExternalLink size={13} /></span>
          </a>
        ))}
      </div>
    </section>
  );
}

export default function RecordDetail({ record }: { record: RecordWithReview }) {
  const router = useRouter();
  const initialQuestionImages = toImages(record.question_images || record.image);
  const initialAnswerImages = toImages(record.answer_images);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [questionImages, setQuestionImages] = useState(initialQuestionImages);
  const [answerImages, setAnswerImages] = useState(initialAnswerImages);
  const [form, setForm] = useState({
    subject: record.subject,
    category: record.category,
    source: record.source,
    tags: record.tags,
    question: record.question,
    answer: record.answer,
    my_mistake: record.my_mistake,
  });

  const cleanupTemporaryImages = async () => {
    const temporary = [...questionImages, ...answerImages].filter((item) => item.temporary).map((item) => item.name);
    if (temporary.length === 0) return;
    await fetch("/api/uploads/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: temporary }),
    });
  };

  const cancelEditing = async () => {
    await cleanupTemporaryImages();
    setForm({
      subject: record.subject,
      category: record.category,
      source: record.source,
      tags: record.tags,
      question: record.question,
      answer: record.answer,
      my_mistake: record.my_mistake,
    });
    setQuestionImages(initialQuestionImages);
    setAnswerImages(initialAnswerImages);
    setError("");
    setEditing(false);
  };

  const save = async () => {
    if (!form.question.trim()) {
      setError("题目内容不能为空");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/records/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          question_images: questionImages.map((item) => item.name),
          answer_images: answerImages.map((item) => item.name),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "保存失败");
      setQuestionImages(questionImages.map((item) => ({ ...item, temporary: false })));
      setAnswerImages(answerImages.map((item) => ({ ...item, temporary: false })));
      setEditing(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm("永久删除这道错题？题目图片、答案图片和全部复习记录都会一并删除。")) return;
    const response = await fetch(`/api/records/${record.id}`, { method: "DELETE" });
    if (!response.ok) {
      setError("删除失败，请重试");
      return;
    }
    router.push("/");
    router.refresh();
  };

  if (editing) {
    return (
      <div className="page-shell">
        <header className="flex flex-col gap-5 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button type="button" onClick={() => void cancelEditing()} className="mb-4 inline-flex items-center gap-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"><ArrowLeft size={14} />退出编辑</button>
            <h1 className="page-title">编辑错题</h1>
            <p className="page-description">重新识别图片或直接修正文稿，保存前核对右侧预览。</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void cancelEditing()} className="secondary-button">取消</button>
            <button type="button" onClick={() => void save()} disabled={saving} className="primary-button"><Save size={15} />{saving ? "保存中…" : "保存修改"}</button>
          </div>
        </header>

        <section className="grid gap-4 border-b border-[var(--line)] py-6 md:grid-cols-4">
          <div>
            <label className="field-label">科目</label>
            <select value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value as "math" | "cs408", category: "" })} className="field-control">
              {SUBJECTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">分类</label>
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="field-control">
              <option value="">未分类</option>
              {CATEGORIES[form.subject].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div><label className="field-label">来源</label><input value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} className="field-control" /></div>
          <div><label className="field-label">标签</label><input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} className="field-control" /></div>
        </section>

        <div className="grid gap-8 pt-7 xl:grid-cols-[minmax(0,1.04fr)_minmax(420px,.96fr)]">
          <div className="space-y-9">
            <section>
              <h2 className="mb-4 text-base font-semibold">题目</h2>
              <OcrInputSection kind="question" subject={form.subject} value={form.question} onChange={(value) => setForm({ ...form, question: value })} images={questionImages} onImagesChange={setQuestionImages} />
              <label className="field-label mt-5">题目 Markdown + LaTeX</label>
              <textarea rows={12} value={form.question} onChange={(event) => setForm({ ...form, question: event.target.value })} className="field-control resize-y font-mono text-[13px] leading-6" />
            </section>
            <section className="border-t border-[var(--line)] pt-8">
              <h2 className="mb-4 text-base font-semibold">答案与解析</h2>
              <OcrInputSection kind="answer" subject={form.subject} value={form.answer} onChange={(value) => setForm({ ...form, answer: value })} images={answerImages} onImagesChange={setAnswerImages} />
              <label className="field-label mt-5">答案 Markdown + LaTeX</label>
              <textarea rows={10} value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })} className="field-control resize-y font-mono text-[13px] leading-6" />
            </section>
            <section className="border-t border-[var(--line)] pt-8"><label className="field-label">我的错因</label><input value={form.my_mistake} onChange={(event) => setForm({ ...form, my_mistake: event.target.value })} className="field-control" /></section>
          </div>
          <aside className="xl:sticky xl:top-8 xl:self-start">
            <div className="border-b border-[var(--line)] pb-3 text-sm font-semibold">实时预览</div>
            <div className="divide-y divide-[var(--line)] border-b border-[var(--line)] bg-[var(--surface)]">
              <section className="min-h-52 px-5 py-5"><div className="field-label">题目</div><MathView content={form.question} /></section>
              <section className="min-h-44 px-5 py-5"><div className="field-label">答案与解析</div>{form.answer ? <MathView content={form.answer} /> : <p className="text-sm text-[var(--muted)]">答案尚未录入。</p>}</section>
            </div>
            {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="flex flex-col gap-5 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/" className="mb-4 inline-flex items-center gap-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"><ArrowLeft size={14} />返回错题库</Link>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-[var(--accent)]">{SUBJECT_LABEL[record.subject]}</span>
            <span className="text-[var(--muted)]">{record.category || "未分类"}</span>
            <span className="text-[var(--muted)]">录入于 {formatDate(record.created_at)}</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">错题详情</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing(true)} className="secondary-button"><Edit3 size={15} />编辑</button>
          <button type="button" onClick={() => void remove()} className="danger-button"><Trash2 size={15} />删除</button>
        </div>
      </header>

      <div className="grid gap-9 pt-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0">
          <section className="border-b border-[var(--line)] pb-8">
            <div className="field-label">题目</div>
            <MathView content={record.question} className="text-[16px]" />
          </section>
          <section className="border-b border-[var(--line)] py-8">
            <div className="field-label">答案与解析</div>
            {record.answer ? <MathView content={record.answer} /> : <p className="text-sm text-[var(--muted)]">尚未录入答案与解析。</p>}
          </section>
          {record.my_mistake && (
            <section className="py-8">
              <div className="field-label">我的错因</div>
              <p className="border-l-2 border-[var(--accent)] pl-4 text-sm leading-7">{record.my_mistake}</p>
            </section>
          )}
        </main>

        <aside className="space-y-7 xl:border-l xl:border-[var(--line)] xl:pl-7">
          <section>
            <div className="field-label">记录信息</div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-[var(--muted)]">来源</dt><dd className="text-right">{record.source || "未填写"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[var(--muted)]">标签</dt><dd className="flex flex-wrap justify-end gap-1 text-right">{record.tags ? record.tags.split(",").filter(Boolean).map((item) => <span key={item} className="text-[var(--accent)]">#{item.trim()}</span>) : "未填写"}</dd></div>
            </dl>
          </section>
          <section className="border-t border-[var(--line)] pt-6">
            <div className="field-label">复习状态</div>
            <div className="flex items-start gap-3"><CalendarClock className="mt-0.5 text-[var(--accent)]" size={17} /><div className="text-sm leading-6"><div>{record.due_date > 0 ? `${formatDate(record.due_date)} 复习` : "尚未安排"}</div><div className="text-xs text-[var(--muted)]">间隔 {record.interval} 天 · 已复习 {record.reps} 次 · 遗忘 {record.lapses} 次</div></div></div>
          </section>
          <div className="space-y-7 border-t border-[var(--line)] pt-6">
            <ImageGallery title="题目原图" images={questionImages} />
            <ImageGallery title="答案原图" images={answerImages} />
          </div>
        </aside>
      </div>
      {error && <p className="mt-5 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
