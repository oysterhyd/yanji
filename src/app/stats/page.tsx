import Link from "next/link";
import { ArrowLeft, BarChart3, Flame, RotateCcw, Target } from "lucide-react";
import { recordStats, reviewTrend } from "@/lib/db";
import { currentTimestamp, SUBJECT_LABEL } from "@/lib/constants";

export const dynamic = "force-dynamic";

const DAYS = 30;

export default function StatsPage() {
  const now = currentTimestamp();
  const stats = recordStats(now);
  const trend = reviewTrend(DAYS);

  const totals = stats.reduce(
    (acc, item) => ({
      total: acc.total + item.total,
      due: acc.due + item.due,
      mastered: acc.mastered + item.mastered,
      lapses: acc.lapses + item.totalLapses,
    }),
    { total: 0, due: 0, mastered: 0, lapses: 0 }
  );
  const maxReviews = Math.max(1, ...trend.map((point) => point.reviews));
  const totalReviews = trend.reduce((acc, point) => acc + point.reviews, 0);

  return (
    <div className="page-shell">
      <header className="flex flex-col gap-5 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/" className="mb-4 inline-flex items-center gap-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"><ArrowLeft size={14} />返回错题库</Link>
          <h1 className="page-title">复习统计</h1>
          <p className="page-description">按科目查看掌握情况，回顾近 {DAYS} 天的复习节奏。</p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 border-b border-[var(--line)] py-6 md:grid-cols-4">
        {[
          { label: "全部错题", value: totals.total, icon: Target },
          { label: "今日待复习", value: totals.due, icon: RotateCcw },
          { label: "已掌握", value: totals.mastered, icon: BarChart3 },
          { label: "累计遗忘", value: totals.lapses, icon: Flame },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><Icon size={17} strokeWidth={1.8} /></span>
              <div>
                <div className="text-xl font-semibold tracking-tight">{item.value}</div>
                <div className="mt-0.5 text-xs text-[var(--muted)]">{item.label}</div>
              </div>
            </div>
          );
        })}
      </section>

      <div className="grid gap-8 pt-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">近 {DAYS} 天复习趋势</h2>
            <span className="text-xs text-[var(--muted)]">共 {totalReviews} 次复习</span>
          </div>
          {trend.length === 0 ? (
            <div className="grid min-h-48 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--muted)]">还没有复习记录，完成几次复习后这里会显示趋势。</div>
          ) : (
            <div className="flex items-end gap-[3px] rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 pb-2 pt-6" style={{ minHeight: 220 }}>
              {trend.map((point) => {
                const height = Math.max(3, Math.round((point.reviews / maxReviews) * 140));
                const forgottenRatio = point.reviews > 0 ? point.forgotten / point.reviews : 0;
                const forgottenHeight = Math.round(height * forgottenRatio);
                return (
                  <div key={point.day} className="group flex min-w-0 flex-1 flex-col items-center gap-1.5" title={`${point.day}：${point.reviews} 次复习，${point.forgotten} 次遗忘`}>
                    <span className="text-[10px] text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100">{point.reviews}</span>
                    <div className="relative w-full max-w-7 overflow-hidden rounded-sm bg-[var(--accent)]/85" style={{ height }}>
                      {forgottenHeight > 0 && (
                        <div className="absolute inset-x-0 bottom-0 bg-[var(--danger)]/80" style={{ height: forgottenHeight }} />
                      )}
                    </div>
                    <span className="text-[9px] text-[var(--muted)]">{point.day.slice(5).replace("-", "/")}</span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-2 flex items-center gap-4 text-[11px] text-[var(--muted)]">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-[var(--accent)]/85" />正常复习</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm bg-[var(--danger)]/80" />遗忘</span>
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-base font-semibold">科目与分类</h2>
          {stats.length === 0 ? (
            <div className="grid min-h-48 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--muted)]">还没有错题数据。</div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[var(--line)]">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[var(--surface)] text-left text-xs text-[var(--muted)]">
                    <th className="px-4 py-3 font-medium">科目 / 分类</th>
                    <th className="px-3 py-3 text-right font-medium">总数</th>
                    <th className="px-3 py-3 text-right font-medium">待复习</th>
                    <th className="px-3 py-3 text-right font-medium">已掌握</th>
                    <th className="px-4 py-3 text-right font-medium">遗忘次数</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((item) => (
                    <tr key={`${item.subject}-${item.category}`} className="border-t border-[var(--line)]">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-[var(--accent)]">{SUBJECT_LABEL[item.subject]}</span>
                        <span className="ml-2 text-xs text-[var(--muted)]">{item.category || "未分类"}</span>
                      </td>
                      <td className="px-3 py-3 text-right">{item.total}</td>
                      <td className="px-3 py-3 text-right">{item.due}</td>
                      <td className="px-3 py-3 text-right">{item.mastered}</td>
                      <td className="px-4 py-3 text-right">{item.totalLapses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
