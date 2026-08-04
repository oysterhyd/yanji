"use client";

import { useRouter } from "next/navigation";
import RecordForm, { RecordFormValues } from "@/components/RecordForm";

export default function NewRecordPage() {
  const router = useRouter();

  const submit = async (values: RecordFormValues) => {
    try {
      const response = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: values.subject,
          category: values.category,
          source: values.source,
          tags: values.tags,
          question: values.question,
          answer: values.answer,
          my_mistake: values.my_mistake,
          question_images: values.questionImages.map((image) => image.name),
          answer_images: values.answerImages.map((image) => image.name),
        }),
      });
      const body = await response.json();
      if (!response.ok) return { ok: false, error: body.error ?? "保存失败" };
      router.push(`/records/${body.id}`);
      router.refresh();
      return { ok: true };
    } catch (caught) {
      return { ok: false, error: caught instanceof Error ? caught.message : "保存失败" };
    }
  };

  return (
    <RecordForm
      title="新增错题"
      description="分别转写题目与答案，在保存前核对 Markdown 和公式排版。"
      backLabel="返回错题库"
      cancelLabel="取消"
      submitLabel="保存错题"
      submitBusyLabel="保存中…"
      confirmCancelMessage="放弃当前未保存的录入内容？"
      initial={{
        subject: "math",
        category: "",
        source: "",
        tags: "",
        question: "",
        answer: "",
        my_mistake: "",
        questionImages: [],
        answerImages: [],
      }}
      onSubmit={submit}
      onCancel={() => router.push("/")}
    />
  );
}
