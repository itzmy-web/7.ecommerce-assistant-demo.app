import { Bot, Clock, PlayCircle, RefreshCw, Timer } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAutomationOverview } from "@/lib/api";
import { getAuthToken } from "@/lib/session";
import type { AgentRiskLevel } from "@/types";

const riskLabels: Record<string, string> = {
  R0: "只读",
  R1: "低风险",
  R2: "需确认",
  R3: "Owner 专属",
};

const riskTones: Record<string, string> = {
  R0: "bg-slate-100 text-slate-600",
  R1: "bg-orange-50 text-orange-600",
  R2: "bg-amber-100 text-amber-700",
  R3: "bg-rose-100 text-rose-700",
};

const taskStatusLabels: Record<string, string> = {
  queued: "排队中",
  running: "执行中",
  awaiting_approval: "待审批",
};

function formatTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

/** 渲染自动化任务中心：系统心跳、竞品监控、活跃 Agent 任务与生成作业的只读聚合视图。
 * 2026-10-13 风格重做：统计带首卡橙色渐变高亮（呼应任务中心参考稿），仅改样式不改数据逻辑。 */
export default async function AutomationPage() {
  const token = await getAuthToken();
  if (!token) {
    redirect("/login");
  }

  const overview = await getAutomationOverview();

  if (!overview) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center gap-3 px-4">
        <p className="text-lg font-semibold text-slate-900">自动化任务中心暂不可用</p>
        <p className="text-sm text-slate-500">
          请确认后端服务已启动且版本包含 /api/v1/automation/overview 接口。
        </p>
      </main>
    );
  }

  const statCards = [
    { label: "排队中的 Run", value: overview.agent_runs_queued, icon: Clock },
    { label: "执行中的 Run", value: overview.agent_runs_running, icon: PlayCircle },
    { label: "生成作业（图/视频）", value: overview.generation_jobs_active, icon: RefreshCw },
    { label: "活跃 Agent 任务", value: overview.active_agent_tasks.length, icon: Bot },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Timer className="h-6 w-6 text-orange-600" />
            自动化任务中心
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            系统心跳、竞品监控与 Agent 任务的只读聚合视图 · 数据时间{" "}
            {formatTime(overview.generated_at)}
          </p>
        </div>
      </header>

      {/* 运行概况数字带：首卡橙色渐变高亮，其余白卡 + 橙色图标章 */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((card, index) =>
          index === 0 ? (
            <div
              key={card.label}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 px-4 py-4 shadow-lg shadow-orange-500/25"
            >
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/15" aria-hidden="true" />
              <card.icon className="h-5 w-5 text-white" />
              <div className="mt-2 text-2xl font-extrabold text-white">{card.value}</div>
              <div className="mt-0.5 text-xs text-orange-50">{card.label}</div>
            </div>
          ) : (
            <div
              key={card.label}
              className="rounded-2xl border border-orange-100 bg-white px-4 py-4 shadow-sm"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
                <card.icon className="h-4.5 w-4.5 text-orange-500" />
              </span>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">{card.value}</div>
              <div className="mt-0.5 text-xs text-slate-500">{card.label}</div>
            </div>
          ),
        )}
      </section>

      {/* 系统心跳 */}
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">系统心跳（自动维护）</h2>
        <ul className="mt-3 divide-y divide-orange-50">
          {overview.system_heartbeats.map((h) => (
            <li key={h.task} className="flex items-start justify-between gap-4 py-3">
              <div>
                <div className="text-sm font-medium text-slate-800">{h.name}</div>
                <div className="mt-0.5 text-xs text-slate-500">{h.description}</div>
              </div>
              <span className="shrink-0 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600">
                每 {h.every_seconds} 秒
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* 竞品监控 */}
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">竞品监控（到期自动执行）</h2>
        {overview.competitor_monitors.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            暂无活跃监控。在商品详情页「竞品监控」里添加后，这里会显示下一次自动检查时间。
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-orange-50">
            {overview.competitor_monitors.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    {m.product_name}{" "}
                    {m.overdue && (
                      <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                        已到期待执行
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    每 {m.interval_days} 天检查 · 上次 {formatTime(m.last_checked_at)} · 下次{" "}
                    {formatTime(m.next_check_at)}
                  </div>
                </div>
                <Link
                  href={`/products/${m.product_id}`}
                  className="shrink-0 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-medium text-orange-600 transition hover:bg-orange-100"
                >
                  处理
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 活跃 Agent 任务 */}
      <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">活跃 Agent 任务</h2>
        {overview.active_agent_tasks.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            当前没有排队 / 执行中 / 待审批的任务。去{" "}
            <Link href="/agent" className="text-orange-600 hover:underline">
              Agent 平台
            </Link>{" "}
            发起一个工作流。
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-orange-50">
            {overview.active_agent_tasks.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-800">{t.title}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {t.workflow_key} · 创建于 {formatTime(t.created_at)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      riskTones[t.risk_level] ?? riskTones.R1
                    }`}
                  >
                    {riskLabels[t.risk_level] ?? t.risk_level}
                  </span>
                  <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">
                    {taskStatusLabels[t.status] ?? t.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
