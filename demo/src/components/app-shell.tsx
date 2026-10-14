"use client";

import {
  BarChart3,
  Bot,
  ClipboardList,
  FileText,
  ImageIcon,
  LayoutGrid,
  LogOut,
  Megaphone,
  Package,
  Store as StoreIcon,
  Timer,
  UserRound,
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

/**
 * 侧栏任务栏：所有功能都从这里进入（2026-10-14 调整——原首页「功能入口」卡片全部并入侧栏，首页不再重复展示）。
 * 按「基础管理 / 单品运营 / 智能执行」三段分组；badgeKey 指向汇总里的实时数量。
 * 「补商品信息 / 投放建议 / 周期复盘」经 /workflows/* 跳转路由落到首个商品的对应标签页。
 */
const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "基础管理",
    items: [
      { href: "/", label: "工作台总览", icon: LayoutGrid, exact: true },
      { href: "/stores", label: "店铺管理", icon: StoreIcon, badgeKey: "stores", badgeTone: "slate" },
      { href: "/products", label: "商品池", icon: Package, badgeKey: "products", badgeTone: "amber" },
      { href: "/imports", label: "导入中心", icon: ClipboardList },
    ],
  },
  {
    label: "单品运营",
    items: [
      { href: "/workflows/product-info", label: "补商品信息", icon: ImageIcon },
      { href: "/workflows/ads", label: "投放建议", icon: Megaphone },
      { href: "/workflows/review", label: "周期复盘", icon: FileText },
    ],
  },
  {
    label: "智能执行",
    items: [
      { href: "/dashboard", label: "数据看板", icon: BarChart3, badgeKey: "low_stock_skus", badgeTone: "sky" },
      { href: "/automation", label: "自动化任务", icon: Timer, badgeKey: "active_tasks", badgeTone: "sky" },
      { href: "/agent", label: "Agent 中心", icon: Bot, badgeKey: "pending_approvals", badgeTone: "rose" },
      { href: "/digital-human", label: "AI 数字人", icon: UserRound },
    ],
  },
];

/** 移动端横滑导航用的扁平列表（移动端不展示分组标题）。 */
const flatNavItems: NavItem[] = navGroups.flatMap((group) => group.items);

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
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label} className="pb-1">
              <p className="px-3 pb-1.5 pt-3 text-[11px] font-semibold tracking-[0.16em] text-slate-500">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
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
              </div>
            </div>
          ))}
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
          {flatNavItems.map((item) => {
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
