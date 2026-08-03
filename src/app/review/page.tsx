import { dueRecords } from "@/lib/db";
import ReviewFlow from "@/components/ReviewFlow";

export const dynamic = "force-dynamic";

export default function ReviewPage() {
  const records = dueRecords();
  return <ReviewFlow initial={records} />;
}
