import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getDashboardInventoryAlerts,
  getDashboardOverview,
  getDashboardPerformanceTrend,
} from "@/lib/api";
import { getAuthToken } from "@/lib/session";

import { PrintButton } from "./print-button";

type PrintPageProps = {
  searchParams?: Promise<{ days?: string }>;
};

function money(value: string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `¥${value}`;
}

/** 渲染看板报告打印页：白底黑字的友好排版，浏览器「另存为 PDF」即为报告导出。 */
export default async function DashboardPrintPage({ searchParams }: PrintPageProps) {
  const token = await getAuthToken();
  if (!token) {
    redirect("/login");
  }

  const params = (await searchParams) ?? {};
  const days = Math.min(90, Math.max(7, Number(params.days ?? 30)));
  const [overview, trend, alerts] = await Promise.all([
    getDashboardOverview(),
    getDashboardPerformanceTrend(days),
    getDashboardInventoryAlerts(),
  ]);

  if (!overview) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p>看板数据暂不可用，请确认后端服务已启动。</p>
        <Link href="/dashboard" className="text-violet-600 underline">
          返回看板
        </Link>
      </main>
    );
  }

  const points = trend.points;

  return (
    <main className="mx-auto max-w-3xl bg-white px-8 py-10 text-slate-900">
      <header className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
        <div>
          <h1 className="text-2xl font-bold">电商运营助手 · 经营看板报告</h1>
          <p className="mt-1 text-sm text-slate-500">
            统计窗口：近 {days} 天 · 生成时间：{new Date().toLocaleString("zh-CN", { hour12: false })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <PrintButton />
          <Link
            href="/dashboard"
            className="text-sm text-slate-500 underline print:hidden"
          >
            返回看板
          </Link>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-3 gap-4">
        {[
          ["商品数", String(overview.product_count)],
          ["活跃 SKU", String(overview.active_sku_count)],
          ["库存告警", String(overview.inventory_alert_count)],
          ["进行中创意", String(overview.active_creative_plan_count)],
          ["待审批", String(overview.pending_approval_count)],
          ["近 30 天营收", money(overview.revenue_last_30d)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 px-4 py-3">
            <div className="text-xs text-slate-500">{label}</div>
            <div className="mt-1 text-xl font-bold">{value}</div>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">趋势摘要（近 {days} 天）</h2>
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs text-slate-500">
              <th className="py-2">日期</th>
              <th className="py-2 text-right">营收</th>
              <th className="py-2 text-right">点击</th>
              <th className="py-2 text-right">转化</th>
            </tr>
          </thead>
          <tbody>
            {points.slice(-14).map((p) => (
              <tr key={p.period_start} className="border-b border-slate-100">
                <td className="py-1.5">{p.period_start}</td>
                <td className="py-1.5 text-right">{money(p.revenue)}</td>
                <td className="py-1.5 text-right">{p.clicks}</td>
                <td className="py-1.5 text-right">{p.conversions}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-slate-500">
          仅展示最近 14 天明细；完整 {points.length} 天序列可在在线看板查看图表。
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">库存告警（{alerts.total}）</h2>
        {alerts.rows.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">无告警，库存健康。</p>
        ) : (
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left text-xs text-slate-500">
                <th className="py-2">商品</th>
                <th className="py-2">SKU</th>
                <th className="py-2 text-right">可用 / 总量</th>
                <th className="py-2 text-right">预警线</th>
              </tr>
            </thead>
            <tbody>
              {alerts.rows.map((r) => (
                <tr key={r.sku_id} className="border-b border-slate-100">
                  <td className="py-1.5">{r.product_name}</td>
                  <td className="py-1.5">
                    {r.sku_code}
                    {r.sku_name ? ` · ${r.sku_name}` : ""}
                  </td>
                  <td className="py-1.5 text-right">
                    {r.available_quantity} / {r.quantity}
                  </td>
                  <td className="py-1.5 text-right">{r.warning_threshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-400">
        电商运营助手 · 本报告由系统自动聚合生成，数据以在线看板为准。
      </footer>
    </main>
  );
}
