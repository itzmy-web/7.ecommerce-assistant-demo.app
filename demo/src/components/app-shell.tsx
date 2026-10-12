"use client";

import {
  BarChart3,
  Bot,
  ClipboardList,
  LayoutGrid,
  LogOut,
  Settings,
  Timer,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
};

/** 主功能导航：让用户在任意页面都能一眼看到系统有哪些能力并随时切换。 */
const navItems: NavItem[] = [
  { href: "/", label: "工作台", icon: LayoutGrid, exact: true },
  { href: "/dashboard", label: "数据看板", icon: BarChart3 },
  { href: "/automation", label: "自动化任务", icon: Timer },
  { href: "/agent", label: "Agent 中心", icon: Bot },
  { href: "/imports", label: "导入中心", icon: ClipboardList },
  { href: "/digital-human", label: "AI 数字人", icon: UserRound },
  { href: "/settings", label: "模型配置", icon: Settings },
];

/**
 * 渲染 AppShell 组件：登录页直接透传；其余页面套左侧固定导航（桌面）+
 * 顶部横滑导航（移动端），页面内容整体右移，不改动任何既有页面结构。
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (!pathname || pathname.startsWith("/login")) {
    return <>{children}</>;
  }

  const isActive = (item: NavItem) => (item.exact ? pathname === "/" : pathname.startsWith(item.href));

  return (
    <div className="min-h-screen">
      {/* 桌面端左侧固定导航 */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-700 text-white shadow-sm">
            <Bot className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-950">电商运营助手</p>
            <p className="truncate text-[11px] font-medium tracking-wide text-slate-400">E-COMMERCE OPS</p>
          </div>
        </div>

        <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-3">
          {navItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
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
                {item.label}
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
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white lg:hidden">
        <div className="flex items-center gap-2 px-4 pt-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-700 text-white">
            <Bot className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-slate-950">电商运营助手</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 pt-2">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="lg:pl-60">{children}</div>
    </div>
  );
}
