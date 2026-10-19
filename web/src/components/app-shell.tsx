"use client";

import {
  BarChart3,
  Bot,
  ClipboardList,
  LayoutGrid,
  LogOut,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";

import { HamsterAssistant } from "@/components/hamster-assistant";

type SidebarSummary = {
  products: number;
  stores: number;
  low_stock_skus: number;
  pending_approvals: number;
  active_tasks: number;
};

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
  badgeKey?: keyof SidebarSummary;
  badgeTone?: "slate" | "amber" | "rose" | "sky";
};

/** 主功能导航：让用户在任意页面都能一眼看到系统有哪些能力并随时切换；badgeKey 指向汇总里的实时数量。 */
const navItems: NavItem[] = [
  { href: "/", label: "工作台", icon: LayoutGrid, exact: true, badgeKey: "products", badgeTone: "slate" },
  { href: "/dashboard", label: "数据看板", icon: BarChart3, badgeKey: "low_stock_skus", badgeTone: "amber" },
  { href: "/automation", label: "自动化任务", icon: Timer, badgeKey: "active_tasks", badgeTone: "sky" },
  { href: "/agent", label: "Agent 中心", icon: Bot, badgeKey: "pending_approvals", badgeTone: "rose" },
  { href: "/imports", label: "导入中心", icon: ClipboardList },
];

const badgeTones: Record<NonNullable<NavItem["badgeTone"]>, string> = {
  slate: "bg-slate-100 text-slate-600",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  sky: "bg-sky-100 text-sky-700",
};

/**
 * 渲染 AppShell 组件：登录页直接透传；其余页面套左侧固定导航（桌面）+
 * 顶部横滑导航（移动端）+ 数字人悬浮球，页面内容整体右移，不改动任何既有页面结构。
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [summary, setSummary] = useState<SidebarSummary | null>(null);
  const isLoginPage = !pathname || pathname.startsWith("/login");

  const loadSummary = useCallback(async () => {
    if (isLoginPage) return;
    try {
      const response = await fetch("/sidebar-summary", { cache: "no-store" });
      if (!response.ok) return;
      setSummary((await response.json()) as SidebarSummary);
    } catch {
      // 徽标拉取失败不打断导航，下一轮轮询继续。
    }
  }, [isLoginPage]);

  useEffect(() => {
    void loadSummary();
    const timer = window.setInterval(() => void loadSummary(), 60_000);
    return () => window.clearInterval(timer);
  }, [loadSummary]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  const isActive = (item: NavItem) => (item.exact ? pathname === "/" : pathname.startsWith(item.href));
  const badgeValue = (item: NavItem) => (item.badgeKey && summary ? summary[item.badgeKey] : 0);

  return (
    <div className="min-h-screen">
      {/* 桌面端左侧固定导航（打印时隐藏，避免污染导出报告） */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-slate-200 bg-white print:hidden lg:flex">
        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-700 text-white shadow-sm">
            <Bot className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-950">数营参谋</p>
            <p className="truncate text-[11px] font-medium tracking-wide text-slate-400">E-COMMERCE OPS</p>
          </div>
        </div>

        <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-3">
          {navItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            const badge = badgeValue(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-emerald-50 font-semibold text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? "text-emerald-700" : "text-slate-400"}`} aria-hidden="true" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badgeKey && badge > 0 ? (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeTones[item.badgeTone ?? "slate"]}`}>
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 px-3 py-3">
          <Link
            href="/logout"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0 text-slate-400" aria-hidden="true" />
            退出登录
          </Link>
        </div>
      </aside>

      {/* 移动端顶部横滑导航 */}
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white print:hidden lg:hidden">
        <div className="flex items-center gap-2 px-4 pt-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-700 text-white">
            <Bot className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-slate-950">数营参谋</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 pt-2">
          {navItems.map((item) => {
            const active = isActive(item);
            const badge = badgeValue(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item.label}
                {item.badgeKey && badge > 0 ? ` ${badge}` : ""}
              </Link>
            );
          })}
          <Link
            href="/logout"
            className="whitespace-nowrap rounded-full bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
          >
            退出登录
          </Link>
        </nav>
      </div>

      <div className="lg:pl-60">{children}</div>

      {/* 2D 仓鼠 AI 助手：常驻右下角，可动可互动 */}
      <HamsterAssistant />
    </div>
  );
}
