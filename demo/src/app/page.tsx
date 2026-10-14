import {
  BarChart3,
  Bot,
  Boxes,
  Building2,
  ClipboardList,
  Database,
  Download,
  FileText,
  ImageIcon,
  Megaphone,
  Package,
  Settings,
  Timer,
  UserRound,
} from "lucide-react";
import Link from "next/link";

import { FeatureCard, MetricCard } from "@/components/workspace-view";
import { getCurrentUser, getProducts, getStores } from "@/lib/api";
import { getAuthToken } from "@/lib/session";
import type { Product, Store } from "@/types";

type HomeProps = {
  searchParams?: Promise<{ platform?: string; store?: string; demo?: string }>;
};

/**
 * 工作台总览页（2026-10-14 拆分后）：只保留指标、演示引导与功能入口网格。
 * 原首页的店铺视图 → /stores，商品池 → /products，功能与数据完全保留，仅位置调整。
 */
export default async function Home({ searchParams }: HomeProps) {
  const query = searchParams ? await searchParams : {};
  // 总览页聚合商品、店铺和当前用户权限；写操作入口只在 canEdit 为 true 时展示。
  const [products, stores, token] = await Promise.all([getProducts(), getStores(), getAuthToken()]);
  const currentUser = token ? await getCurrentUser(token) : null;
  const canEdit = Boolean(currentUser?.permissions.can_edit);

  const activeStores = stores.filter((store) => store.status === "active").length;
  const platformCount = new Set([...stores.map((store) => store.platform), ...products.map((product) => product.platform)]).size;
  const unboundProducts = products.filter((product) => product.store_id === null).length;
  const features = buildFeatureGrid(products, stores, unboundProducts);

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-5 py-6 text-slate-950 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {/* 演示引导卡：定位 / 能做什么 / 边界 / 玩法，让新用户 30 秒上手 */}
        <section className="rounded-md border border-orange-200 bg-gradient-to-r from-orange-50 via-white to-amber-50 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-2.5 py-1 text-xs font-semibold text-white">演示版 · 使用指南</span>
            <h2 className="text-base font-semibold text-slate-950">专为中小电商团队设计的 AI 运营自动化工作台</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            三层价值递进：<span className="font-semibold text-slate-900">基础管理</span>（商品 / 店铺 / 库存，把数据管起来）
            → <span className="font-semibold text-slate-900">智能诊断</span>（AI Agent 体检商品、产出创意与补货建议）
            → <span className="font-semibold text-slate-900">自动化执行</span>（任务调度 + 高风险操作人工审批），
            AI 数字人作为创意输出环节的辅助播报工具。
          </p>
          <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-600 md:grid-cols-3">
            <div>
              <p className="font-semibold text-slate-900">✅ 能体验什么</p>
              <p>商品池与店铺管理、AI 诊断与创意方案、Agent 任务与人工审批、库存预警与补货建议、数据看板、自动化任务、右下角 AI 数字人播报。</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">🎮 怎么玩</p>
              <p>用左侧栏切换模块；进任意店铺详情可试「店铺授权」；Agent 中心发任务后打开运行详情看实时事件流；登录验证码会直接显示在页面上。</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900">⚠️ 能力边界</p>
              <p>全部数据为内置模拟数据，不会真实调用电商平台 API、不能真实下单；AI 生成内容仅供参考，正式使用请人工复核；演示输入不会被永久存储。</p>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <Link
            href="/agent"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-orange-500 to-red-500 px-3 text-sm font-medium text-white shadow-sm shadow-orange-500/25 hover:opacity-95"
          >
            <Bot className="h-4 w-4" aria-hidden="true" />
            Agent 中心
          </Link>
          {currentUser ? (
            <form action="/logout" method="post" className="inline-flex items-center gap-2">
              <span className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600">
                {currentUser.display_name}
              </span>
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                退出
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              登录
            </Link>
          )}
          <Link
            href="/settings"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            模型配置
          </Link>
        </div>

        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-orange-600">Ecommerce Operation Assistant</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
              多平台店铺运营工作台
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              从总览进入各功能页：店铺管理、商品池、数据看板、自动化任务、Agent 中心与导入中心。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:w-[560px] sm:grid-cols-4">
            <MetricCard label="店铺" value={stores.length} />
            <MetricCard label="活跃店铺" value={activeStores} />
            <MetricCard label="商品" value={products.length} />
            <MetricCard label="平台" value={platformCount} />
          </div>
        </header>

        <section className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">演示和导入</h2>
            <p className="mt-1 text-sm text-slate-500">
              用演示数据快速跑通店铺、库存、投放实验和复盘链路，或下载绩效数据导入模板。
            </p>
            {query.demo === "created" ? (
              <p className="mt-2 text-xs font-medium text-emerald-700">演示数据已准备好。</p>
            ) : null}
            {query.demo === "failed" ? (
              <p className="mt-2 text-xs font-medium text-rose-700">演示数据创建失败，请确认当前账号有编辑权限。</p>
            ) : null}
            {!canEdit ? (
              <p className="mt-2 text-xs font-medium text-amber-700">当前账号为只读权限，只能查看数据，不能创建或导入。</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <form action="/workspace/demo-data" method="post">
                <button
                  type="submit"
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800"
                >
                  <Database className="h-4 w-4" aria-hidden="true" />
                  生成演示数据
                </button>
              </form>
            ) : null}
            <Link
              href="/workspace/templates/performance-records"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              下载导入模板
            </Link>
            {canEdit ? (
              <Link
                href="/imports"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Package className="h-4 w-4" aria-hidden="true" />
                导入中心
              </Link>
            ) : null}
          </div>
        </section>

        {/* 功能入口网格：按功能分页后，总览页负责把用户送到对应任务栏页面 */}
        <section>
          <h2 className="text-sm font-semibold text-slate-950">功能入口</h2>
          <p className="mt-1 text-sm text-slate-500">每张卡片对应一个独立的功能页，点开只处理这一类事情</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {features.map((item) => (
              <FeatureCard key={item.title} {...item} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

/** 构建总览页功能入口网格，从现有业务数据推导稳定的展示模型，不在渲染阶段修改源数据。 */
function buildFeatureGrid(
  products: Product[],
  stores: Store[],
  unboundProducts: number,
): Array<{
  title: string;
  hint: string;
  href: string;
  icon: typeof BarChart3;
  tone: string;
  count?: number;
}> {
  // 入口卡片只用已有数据提示下一步，不自动创建诊断、素材或投放实验。
  const missingSellingPoints = products.filter((product) => product.selling_points.length === 0).length;
  const missingPlatformIds = products.filter((product) => !product.external_product_id).length;
  const productsReadyForOps = products.filter((product) => product.store_id !== null && product.selling_points.length > 0).length;
  const activeStores = stores.filter((store) => store.status === "active").length;

  return [
    {
      title: "店铺管理",
      hint: unboundProducts > 0 ? `${unboundProducts} 个商品待绑定店铺` : `共 ${stores.length} 个店铺，${activeStores} 个活跃`,
      href: "/stores",
      icon: Building2,
      tone: "bg-orange-100 text-orange-700",
      count: stores.length,
    },
    {
      title: "商品池",
      hint: products.length > 0 ? "进入单品运营闭环：诊断 / 素材 / 投放 / 复盘" : "还没有商品，先去新建或导入",
      href: "/products",
      icon: Boxes,
      tone: "bg-amber-100 text-amber-700",
      count: products.length,
    },
    {
      title: "导入数据",
      hint: missingPlatformIds > 0 ? `${missingPlatformIds} 个商品待补平台 ID` : "导入商品 / SKU / 经营数据",
      href: "/imports",
      icon: ClipboardList,
      tone: "bg-orange-100 text-orange-700",
      count: missingPlatformIds,
    },
    {
      title: "补商品信息",
      hint: missingSellingPoints > 0 ? `${missingSellingPoints} 个商品待补卖点` : "进入单品运营闭环",
      href: firstProductHref(products, "overview"),
      icon: ImageIcon,
      tone: "bg-amber-100 text-amber-700",
      count: missingSellingPoints,
    },
    {
      title: "投放建议",
      hint: productsReadyForOps > 0 ? "从素材和链接生成投放建议" : "先补商品基础信息",
      href: firstProductHref(products, "ads"),
      icon: Megaphone,
      tone: "bg-red-100 text-red-700",
      count: productsReadyForOps,
    },
    {
      title: "周期复盘",
      hint: products.length > 0 ? "回填经营数据后生成复盘" : "先创建商品",
      href: firstProductHref(products, "review"),
      icon: FileText,
      tone: "bg-rose-100 text-rose-700",
      count: products.length,
    },
    {
      title: "数据看板",
      hint: "关键指标趋势与打印友好导出报告",
      href: "/dashboard",
      icon: BarChart3,
      tone: "bg-orange-100 text-orange-700",
      count: products.length,
    },
    {
      title: "自动化任务",
      hint: "系统心跳、竞品监控与活跃任务聚合",
      href: "/automation",
      icon: Timer,
      tone: "bg-amber-100 text-amber-700",
    },
    {
      title: "Agent 中心",
      hint: "发起工作流、审批高风险操作、查看记忆",
      href: "/agent",
      icon: Bot,
      tone: "bg-red-100 text-red-700",
    },
    {
      title: "AI 数字人",
      hint: "创意输出环节的辅助播报（右下角悬浮球）",
      href: "/digital-human",
      icon: UserRound,
      tone: "bg-rose-100 text-rose-700",
    },
  ];
}

/** 首个商品链接，从现有业务数据推导稳定的页面展示模型，不在渲染阶段修改源数据。 */
function firstProductHref(products: Product[], tab: string): string {
  return products[0] ? `/products/${products[0].id}?tab=${tab}` : "/products";
}
