import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

import { Store as StoreIcon } from "lucide-react";
import type { Platform, Product, Store } from "@/types";

/**
 * 工作台共享视图组件与数据展示规则。
 * 2026-10-14 拆分：首页原本把店铺视图 / 商品池 / 表单全部堆在一页，
 * 现按功能拆到 /stores 与 /products，公共卡片与解析函数集中在这里，避免三处复制。
 */

export const platformLabels: Record<Platform, string> = {
  douyin: "抖音",
  taobao: "淘宝",
  tmall: "天猫",
  pinduoduo: "拼多多",
  jd: "京东",
  tiktok_shop: "TikTok",
  amazon: "Amazon",
  other: "其他",
};

export const platformFilters: Array<{ value: "all" | Platform; label: string }> = [
  { value: "all", label: "全部平台" },
  { value: "douyin", label: "抖音" },
  { value: "taobao", label: "淘宝" },
  { value: "tmall", label: "天猫" },
  { value: "pinduoduo", label: "拼多多" },
  { value: "jd", label: "京东" },
];

/** 指标卡：总览页顶部数字带。 */
export function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-orange-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

/** 店铺汇总卡片：店铺管理页的店铺列表单元。 */
export function StoreSummaryCard({
  store,
  productCount,
  selected,
}: {
  store: Store;
  productCount: number;
  selected: boolean;
}) {
  return (
    <div
      className={`rounded-md border px-4 py-4 transition ${
        selected
          ? "border-orange-400 bg-orange-50"
          : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-orange-50 text-orange-600">
            <StoreIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">{store.name}</p>
            <p className="mt-1 text-xs text-slate-500">{platformLabels[store.platform]}</p>
          </div>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
          {store.status === "active" ? "启用" : store.status === "paused" ? "暂停" : "关闭"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-500">商品数</p>
          <p className="mt-1 font-semibold text-slate-950">{productCount}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">负责人</p>
          <p className="mt-1 truncate font-semibold text-slate-950">{store.owner_name ?? "-"}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Link
          href={`/products?store=${store.id}`}
          className="inline-flex h-8 items-center rounded-md border border-orange-200 bg-white px-3 text-xs font-medium text-orange-600 hover:bg-orange-50"
        >
          筛选商品
        </Link>
        <Link
          href={`/stores/${store.id}`}
          className="inline-flex h-8 items-center rounded-md bg-gradient-to-r from-orange-500 to-red-500 px-3 text-xs font-medium text-white shadow-sm shadow-orange-500/25 hover:opacity-95"
        >
          店铺详情
        </Link>
      </div>
    </div>
  );
}

/** 商品行：商品池表格单元。 */
export function ProductRow({ product, store }: { product: Product; store: Store | null | undefined }) {
  return (
    <div className="grid gap-3 px-4 py-4 text-sm lg:min-h-16 lg:grid-cols-[1.3fr_0.9fr_0.8fr_0.7fr_1fr_96px] lg:items-center lg:gap-0 lg:py-3">
      <div>
        <p className="font-medium text-slate-950">{product.name}</p>
        <p className="mt-1 text-xs text-slate-500">{product.category ?? "未分类"}</p>
      </div>
      <span className="text-slate-600">{store?.name ?? "未绑定"}</span>
      <span className="text-slate-600">{platformLabels[product.platform]}</span>
      <span className="font-medium text-slate-800">{product.price ? `¥${product.price}` : "-"}</span>
      <div className="flex flex-wrap gap-1.5">
        {product.selling_points.slice(0, 3).map((point) => (
          <span key={point} className="rounded-md bg-orange-50 px-2 py-1 text-xs text-orange-600">
            {point}
          </span>
        ))}
      </div>
      <Link
        href={`/products/${product.id}`}
        className="inline-flex h-9 w-24 items-center justify-center gap-1.5 rounded-md border border-orange-200 bg-white px-3 text-xs font-medium text-orange-600 hover:bg-orange-50"
      >
        进入
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

/** 功能入口卡：总览页的能力导航单元。 */
export function FeatureCard({
  title,
  hint,
  count,
  href,
  icon: Icon,
  tone,
}: {
  title: string;
  hint: string;
  count?: number;
  href: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-md border border-slate-200 bg-white p-4 transition hover:border-orange-200 hover:bg-orange-50/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-md ${tone}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        {typeof count === "number" ? (
          <span className="rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-600">{count}</span>
        ) : null}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-950">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>
    </Link>
  );
}

/** 统计商品by店铺，封装当前页面重复使用的转换或展示规则，并统一处理空值边界。 */
export function countProductsByStore(products: Product[]): Map<number, number> {
  return products.reduce((counts, product) => {
    if (product.store_id !== null) {
      counts.set(product.store_id, (counts.get(product.store_id) ?? 0) + 1);
    }
    return counts;
  }, new Map<number, number>());
}

/** 解析平台，把不可信表单或 JSON 值转换为页面逻辑可安全使用的类型。 */
export function parsePlatform(value: string | undefined): "all" | Platform {
  // URL 筛选参数做白名单校验，避免无效平台值影响服务端渲染结果。
  if (!value || value === "all") {
    return "all";
  }
  return Object.hasOwn(platformLabels, value) ? (value as Platform) : "all";
}

/** 解析店铺ID，把不可信表单或 JSON 值转换为页面逻辑可安全使用的类型。 */
export function parseStoreId(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const storeId = Number(value);
  return Number.isInteger(storeId) && storeId > 0 ? storeId : null;
}
