import { countDue, countMastered, listRecordSummaries, listTags } from "@/lib/db";
import RecordList from "@/components/RecordList";
import { currentTimestamp } from "@/lib/constants";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const subject = typeof params.subject === "string" ? params.subject : "";
  const category = typeof params.category === "string" ? params.category : "";
  const tag = typeof params.tag === "string" ? params.tag : "";
  const kw = typeof params.kw === "string" ? params.kw : "";
  const page = Math.max(1, Number(params.page) || 1);
  const now = currentTimestamp();
  const { items, total } = listRecordSummaries({ subject, category, tag, kw }, PAGE_SIZE, (page - 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const dueCount = countDue(now);
  const mastered = countMastered();
  const tags = listTags();
  return (
    <RecordList
      records={items}
      total={total}
      page={page}
      totalPages={totalPages}
      dueCount={dueCount}
      mastered={mastered}
      now={now}
      subject={subject}
      category={category}
      tag={tag}
      kw={kw}
      tags={tags}
    />
  );
}
