"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Save } from "lucide-react";
import { CATEGORIES, SUBJECTS } from "@/lib/constants";
import MathView from "@/components/MathView";
import OcrInputSection, { SavedImage } from "@/components/OcrInputSection";

export default function NewRecordPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("math");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("");
  const [tags, setTags] = useState("");
  const [myMistake, setMyMistake] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [questionImages, setQuestionImages] = useState<SavedImage[]>([]);
  const [answerImages, setAnswerImages] = useState<SavedImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const savedRef = useRef(false);
  const dirty = useMemo(
    () => Boolean(question || answer || source || tags || myMistake || questionImages.length || answerImages.length),
    [answer, answerImages.length, myMistake, question, questionImages.length, source, tags]
  );

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty || savedRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const temporaryNames = [...questionImages, ...answerImages].map((item) => item.name);
    const sendCleanup = () => {
      if (temporaryNames.length === 0 || savedRef.current) return;
      navigator.sendBeacon(
        "/api/uploads/cleanup",
        new Blob([JSON.stringify({ images: temporaryNames })], { type: "application/json" })
      );
    };
    const interceptNavigation = (event: MouseEvent) => {
      if (!dirty || savedRef.current || event.defaultPrevented || event.button !== 0) return;
      const target = event.target;
      const anchor = target instanceof Element ? target.closest("a") : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      if (!confirm("离开后将丢失当前未保存的录入内容，确定继续？")) {
        event.preventDefault();
        return;
      }
      sendCleanup();
    };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("pagehide", sendCleanup);
    document.addEventListener("click", interceptNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("pagehide", sendCleanup);
      document.removeEventListener("click", interceptNavigation, true);
    };
  }, [answerImages, dirty, questionImages]);

  const cleanupTemporaryImages = async () => {
    const images = [...questionImages, ...answerImages].map((item) => item.name);
    if (images.length === 0) return;
    await fetch("/api/uploads/cleanup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
    });
  };

  const cancel = async () => {
    if (dirty && !confirm("放弃当前未保存的录入内容？")) return;
    await cleanupTemporaryImages();
    router.push("/");
  };

  const save = async () => {
    setError("");
    if (!question.trim()) {
      setError("题目内容不能为空");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          category,
          source,
          tags,
          question,
          answer,
          my_mistake: myMistake,
          question_images: questionImages.map((item) => item.name),
          answer_images: answerImages.map((item) => item.name),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "保存失败");
      savedRef.current = true;
      router.push(`/records/${body.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败");
      setSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <header className="flex flex-col gap-5 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/" className="mb-4 inline-flex items-center gap-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"><ArrowLeft size={14} />返回错题库</Link>
          <h1 className="page-title">新增错题</h1>
          <p className="page-description">分别转写题目与答案，在保存前核对 Markdown 和公式排版。</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void cancel()} className="secondary-button">取消</button>
          <button type="button" onClick={() => void save()} disabled={saving} className="primary-button"><Save size={15} />{saving ? "保存中…" : "保存错题"}</button>
        </div>
      </header>

      <section className="grid gap-4 border-b border-[var(--line)] py-6 md:grid-cols-4">
        <div>
          <label className="field-label">科目</label>
          <select value={subject} onChange={(event) => { setSubject(event.target.value); setCategory(""); }} className="field-control">
            {SUBJECTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">分类</label>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="field-control">
            <option value="">未分类</option>
            {CATEGORIES[subject].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">来源</label>
          <input value={source} onChange={(event) => setSource(event.target.value)} className="field-control" placeholder="如：660 题 P120 #18" />
        </div>
        <div>
          <label className="field-label">标签</label>
          <input value={tags} onChange={(event) => setTags(event.target.value)} className="field-control" placeholder="逗号分隔" />
        </div>
      </section>

      <div className="grid gap-8 pt-7 xl:grid-cols-[minmax(0,1.04fr)_minmax(420px,.96fr)]">
        <div className="min-w-0 space-y-9">
          <section>
            <div className="mb-4 flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">1</span><h2 className="text-base font-semibold">题目</h2></div>
            <OcrInputSection kind="question" subject={subject} value={question} onChange={setQuestion} images={questionImages} onImagesChange={setQuestionImages} />
            <label className="field-label mt-5">题目 Markdown + LaTeX</label>
            <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={12} className="field-control resize-y font-mono text-[13px] leading-6" placeholder="识别结果会出现在这里，也可以直接输入。" />
          </section>

          <section className="border-t border-[var(--line)] pt-8">
            <div className="mb-4 flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">2</span><h2 className="text-base font-semibold">答案与解析</h2><span className="text-xs text-[var(--muted)]">可选</span></div>
            <OcrInputSection kind="answer" subject={subject} value={answer} onChange={setAnswer} images={answerImages} onImagesChange={setAnswerImages} />
            <label className="field-label mt-5">答案 Markdown + LaTeX</label>
            <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={10} className="field-control resize-y font-mono text-[13px] leading-6" placeholder="上传答案图片识别，或手动填写。" />
          </section>

          <section className="border-t border-[var(--line)] pt-8">
            <label className="field-label">我的错因</label>
            <input value={myMistake} onChange={(event) => setMyMistake(event.target.value)} className="field-control" placeholder="用一句话记录真正的错误原因" />
          </section>
        </div>

        <aside className="min-w-0 xl:sticky xl:top-8 xl:self-start">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
            <h2 className="text-sm font-semibold">实时预览</h2>
            <span className="flex items-center gap-1 text-xs text-[var(--muted)]"><Check size={13} />保存前请核对</span>
          </div>
          <div className="divide-y divide-[var(--line)] border-b border-[var(--line)] bg-[var(--surface)]">
            <section className="min-h-52 px-5 py-5">
              <div className="field-label">题目</div>
              {question ? <MathView content={question} /> : <p className="text-sm text-[var(--muted)]">题目识别或输入后将在这里渲染。</p>}
            </section>
            <section className="min-h-44 px-5 py-5">
              <div className="field-label">答案与解析</div>
              {answer ? <MathView content={answer} /> : <p className="text-sm text-[var(--muted)]">答案可以稍后补录。</p>}
            </section>
          </div>
          {error && <div className="mt-4 rounded-lg border border-[color-mix(in_srgb,var(--danger)_25%,var(--line))] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--danger)]">{error}</div>}
        </aside>
      </div>
    </div>
  );
}
