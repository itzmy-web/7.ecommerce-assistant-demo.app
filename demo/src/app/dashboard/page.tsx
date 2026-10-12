import {
  AlertTriangle,
  BarChart3,
  Boxes,
  ClipboardCheck,
  CircleDollarSign,
  Package,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PerformanceTrendChart } from "@/components/charts/performance-trend-chart";
import {
  getDashboardInventoryAlerts,
  getDashboardOverview,
  getDashboardPerformanceTrend,
} from "@/lib/api";
import { getAuthToken } from "@/lib/session";
import type { DashboardOverview } from "@/types";

type DashboardProps = {
  searchParams?: Promise<{ days?: string }>;
};

const rangeOptions = [7, 30, 90] as const;

/** 渲染数据看板页：概览卡片 + 经营趋势 + 库存告警，只读聚合展示。 */
export default async function DashboardPage({ searchParams }: DashboardProps) {
  const token = await getAuthToken();
  if (!token) {
    redirect("/login");
  }

  const query = searchParams ? await searchParams : {};
  const parsedDays = Number(query.days);
  const days = rangeOptions.includes(parsedDays as (typeof rangeOptions)[number])
    ? parsedDays
    : 30;

  // 看板是纯只读页面：任一接口失败都降级为空态，不阻塞整体渲染。
  const [overview, trend, alerts] = await Promise.all([
    getDashboardOverview(),
    getDashboardPerformanceTrend(days),
    getDashboardInventoryAlerts(),
  ]);

  const cards = buildOverviewCards(overview);
  const emptyTrend = trend.points.length === 0;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <BarChart3 className="h-6 w-6 text-sky-600" />
            数据看板
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            商品、库存、创意与 Agent 审批的关键指标汇总（只读）。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/print?days=${days}`}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:border-sky-300 hover:text-sky-700"
          >
            导出报告
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <card.icon className={`h-3.5 w-3.5 ${card.tone}`} />
              {card.label}
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">经营趋势</h2>
          <div className="flex gap-1">
            {rangeOptions.map((option) => (
              <Link
                key={option}
                href={`/dashboard?days=${option}`}
                className={`rounded-md px-2.5 py-1 text-xs transition ${
                  option === days
                    ? "bg-sky-600 text-white"
                    : "border border-slate-200 text-slate-600 hover:border-sky-300"
                }`}
              >
                {option} 天
              </Link>
            ))}
          </div>
        </div>
        {emptyTrend ? (
          <div className="flex h-80 items-center justify-center text-sm text-slate-400">
            近 {days} 天还没有经营数据，先去「导入数据」录入绩效记录吧。
          </div>
        ) : (
          <PerformanceTrendChart points={trend.points} />
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          库存告警
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {alerts.total}
          </span>
        </h2>
        {alerts.rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            暂无库存告警，所有 SKU 可用量都在阈值之上。
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="py-2 pr-3 font-medium">商品</th>
                  <th className="py-2 pr-3 font-medium">SKU</th>
                  <th className="py-2 pr-3 font-medium">库存量</th>
                  <th className="py-2 pr-3 font-medium">锁定</th>
                  <th className="py-2 pr-3 font-medium">可用量</th>
                  <th className="py-2 pr-3 font-medium">阈值</th>
                </tr>
              </thead>
              <tbody>
                {alerts.rows.map((row) => (
                  <tr key={row.sku_id} className="border-b border-slate-50">
                    <td className="py-2 pr-3">
                      <Link
                        href={`/products/${row.product_id}`}
                        className="text-sky-700 hover:underline"
                      >
                        {row.product_name}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-slate-600">
                      {row.sku_code}
                      {row.sku_name ? ` · ${row.sku_name}` : ""}
                    </td>
                    <td className="py-2 pr-3">{row.quantity}</td>
                    <td className="py-2 pr-3 text-slate-500">{row.locked_quantity}</td>
                    <td className="py-2 pr-3 font-semibold text-rose-600">
                      {row.available_quantity}
                    </td>
                    <td className="py-2 pr-3 text-slate-500">{row.warning_threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

type OverviewCard = {
  label: string;
  value: string;
  icon: typeof Package;
  tone: string;
};

/** 把概览指标组装成卡片数据；接口失败时全部展示为占位值。 */
function buildOverviewCards(overview: DashboardOverview | null): OverviewCard[] {
  if (!overview) {
    return [
      { label: "商品总数", value: "—", icon: Package, tone: "text-sky-500" },
      { label: "在售 SKU", value: "—", icon: Boxes, tone: "text-cyan-600" },
      { label: "库存告警", value: "—", icon: AlertTriangle, tone: "text-amber-500" },
      { label: "进行中创意", value: "—", icon: Sparkles, tone: "text-violet-500" },
      { label: "待审批任务", value: "—", icon: ClipboardCheck, tone: "text-rose-500" },
      { label: "近 30 天收入", value: "—", icon: CircleDollarSign, tone: "text-emerald-600" },
    ];
  }
  const revenue = formatRevenue(overview.revenue_last_30d);
  const roi = overview.avg_roi_last_30d ? ` · ROI ${overview.avg_roi_last_30d}` : "";
  return [
    { label: "商品总数", value: String(overview.product_count), icon: Package, tone: "text-sky-500" },
    { label: "在售 SKU", value: String(overview.active_sku_count), icon: Boxes, tone: "text-cyan-600" },
    {
      label: "库存告警",
      value: String(overview.inventory_alert_count),
      icon: AlertTriangle,
      tone: "text-amber-500",
    },
    {
      label: "进行中创意",
      value: String(overview.active_creative_plan_count),
      icon: Sparkles,
      tone: "text-violet-500",
    },
    {
      label: "待审批任务",
      value: String(overview.pending_approval_count),
      icon: ClipboardCheck,
      tone: "text-rose-500",
    },
    {
      label: "近 30 天收入",
      value: `${revenue}${roi}`,
      icon: CircleDollarSign,
      tone: "text-emerald-600",
    },
  ];
}

/** 千分位格式化收入金额；异常输入时原样返回。 */
function formatRevenue(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return value;
  }
  return amount.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}
