"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, ChartColumnBig, DatabaseBackup, GraduationCap, Plus, RotateCcw } from "lucide-react";

const items = [
  { href: "/", label: "错题库", icon: BookOpenText },
  { href: "/new", label: "新增错题", icon: Plus },
  { href: "/review", label: "今日复习", icon: RotateCcw },
  { href: "/stats", label: "统计", icon: ChartColumnBig },
  { href: "/backup", label: "备份", icon: DatabaseBackup },
];

export default function BottomNav() {
  const pathname = usePathname();

  const links = items.map((item) => {
    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    const Icon = item.icon;
    return (
      <Link key={item.href} href={item.href} className={`app-nav-link ${active ? "is-active" : ""}`}>
        <Icon size={18} strokeWidth={1.8} />
        <span>{item.label}</span>
      </Link>
    );
  });

  return (
    <>
      <aside className="app-sidebar">
        <Link href="/" className="app-brand">
          <span className="app-brand-mark"><GraduationCap size={21} strokeWidth={1.8} /></span>
          <span>
            <strong>研迹</strong>
            <small>错题与复习</small>
          </span>
        </Link>
        <nav className="app-sidebar-nav">{links}</nav>
        <p className="app-sidebar-note">数学 · 408<br />本地学习工作台</p>
      </aside>
      <nav className="app-mobile-nav">{links}</nav>
    </>
  );
}
