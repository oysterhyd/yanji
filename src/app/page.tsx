import { listRecords } from "@/lib/db";
import RecordList from "@/components/RecordList";
import { currentTimestamp } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const records = listRecords();
  const now = currentTimestamp();
  const dueCount = records.filter((r) => r.due_date > 0 && r.due_date <= now).length;
  const mastered = records.filter((r) => r.interval >= 21).length;
  return (
    <RecordList records={records} dueCount={dueCount} total={records.length} mastered={mastered} now={now} />
  );
}
