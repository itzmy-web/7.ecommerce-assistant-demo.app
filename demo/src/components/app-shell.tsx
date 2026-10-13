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
  slate: "bg-white/15 text-orange-100",
  amber: "bg-amber-400/90 text-amber-950",
  rose: "bg-red-500 text-white",
  sky: "bg-orange-400/90 text-orange-950",
};

/**
 * 渲染 AppShell 组件：登录页直接透传；其余页面套橙红渐变顶栏 + 深色左侧固定导航（桌面）+
 * 顶部横滑导航（移动端）+ 数字人悬浮球，页面内容整体右移，不改动任何既有页面结构。
 * 2026-10-13 风格重做：白底青绿风 → 橙红电商风，仅改样式不改逻辑。
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
    <div className="min-h-screen bg-[#f6f7fb]">
      {/* 橙红渐变顶栏（打印时隐藏，避免污染导出报告） */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-orange-500 via-orange-500 to-red-500 shadow-md shadow-orange-500/20 print:hidden">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white ring-1 ring-white/40">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-base font-bold tracking-wide text-white">电商运营助手</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium tracking-wider text-orange-50 ring-1 ring-white/25 sm:inline">
              统一企业级 SaaS 体系
            </span>
            <Link
              href="/logout"
              className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/25 transition hover:bg-white/25"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              退出
            </Link>
          </div>
        </div>
      </header>

      {/* 桌面端深色左侧固定导航 */}
      <aside className="fixed inset-y-0 left-0 top-14 z-40 hidden w-60 flex-col bg-[#23262f] print:hidden lg:flex">
        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
          {navItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            const badge = badgeValue(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-gradient-to-r from-orange-500 to-red-500 font-semibold text-white shadow-md shadow-orange-500/25"
                    : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? "text-white" : "text-slate-400"}`} aria-hidden="true" />
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

        <div className="border-t border-white/10 px-3 py-3">
          <Link
            href="/logout"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-300"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0 text-slate-500" aria-hidden="true" />
            退出登录
          </Link>
        </div>
      </aside>

      {/* 移动端顶部横滑导航 */}
      <div className="sticky top-14 z-40 border-b border-orange-100 bg-white print:hidden lg:hidden">
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 pt-2">
          {navItems.map((item) => {
            const active = isActive(item);
            const badge = badgeValue(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  active ? "bg-gradient-to-r from-orange-500 to-red-500 text-white" : "bg-orange-50 text-slate-600 hover:bg-orange-100"
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
