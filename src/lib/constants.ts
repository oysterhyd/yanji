export const SUBJECTS = [
  { value: "math", label: "数学" },
  { value: "cs408", label: "408" },
] as const;

export const CATEGORIES: Record<string, string[]> = {
  math: ["高数", "线代", "概率论"],
  cs408: ["数据结构", "操作系统", "计算机网络", "计算机组成"],
};

export const SUBJECT_LABEL: Record<string, string> = { math: "数学", cs408: "408" };

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function currentTimestamp(): number {
  return Date.now();
}
