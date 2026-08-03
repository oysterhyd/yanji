import { notFound } from "next/navigation";
import { getRecord } from "@/lib/db";
import RecordDetail from "@/components/RecordDetail";

export const dynamic = "force-dynamic";

export default async function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = getRecord(Number(id));
  if (!record) notFound();
  return <RecordDetail record={record} />;
}
