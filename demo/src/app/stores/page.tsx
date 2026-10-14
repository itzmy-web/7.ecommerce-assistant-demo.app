import { Package } from "lucide-react";
import Link from "next/link";

import { StoreCreateForm } from "@/components/store-create-form";
import {
  StoreSummaryCard,
  countProductsByStore,
  parsePlatform,
  platformFilters,
} from "@/components/workspace-view";
import { getCurrentUser, getProducts, getStores } from "@/lib/api";
import { getAuthToken } from "@/lib/session";

type StoresProps = {
  searchParams?: Promise<{ platform?: string; store?: string }>;
};

/**
 * 店铺管理页：从原首页「店铺视图」块独立出来的功能页。
 * 保留平台筛选、店铺卡片、未绑定商品提醒与建店表单，内容与首页拆分前一致。
 */
export default async function StoresPage({ searchParams }: StoresProps) {
  const query = searchParams ? await searchParams : {};
  const selectedPlatform = parsePlatform(query.platform);
  const [products, stores, token] = await Promise.all([getProducts(), getStores(), getAuthToken()]);
  const currentUser = token ? await getCurrentUser(token) : null;
  const canEdit = Boolean(currentUser?.permissions.can_edit);

  const productsByStore = countProductsByStore(products);
  const activeStores = stores.filter((store) => store.status === "active").length;
  const unboundProducts = products.filter((product) => product.store_id === null).length;

  // 平台筛选：同时展示该平台店铺，用于快速定位货架。
  const filteredStores =
    selectedPlatform === "all"
      ? stores
      : stores.filter((store) => store.platform === selectedPlatform);

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-5 py-6 text-slate-950 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-orange-600">Ecommerce Operation Assistant</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
              店铺管理
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              按平台归拢店铺与商品归属，共 {stores.length} 个店铺（{activeStores} 个活跃）。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/products"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-gradient-to-r from-orange-500 to-red-500 px-3 text-sm font-medium text-white shadow-sm shadow-orange-500/25 hover:opacity-95"
            >
              <Package className="h-4 w-4" aria-hidden="true" />
              去商品池
            </Link>
          </div>
        </header>

        {!canEdit ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
            当前账号为只读权限，只能查看店铺数据，不能创建店铺。
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {platformFilters.map((platform) => (
            <Link
              key={platform.value}
              href={platform.value === "all" ? "/stores" : `/stores?platform=${platform.value}`}
              className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium ${
                selectedPlatform === platform.value
                  ? "border-orange-500 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-sm shadow-orange-500/25"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-orange-50"
              }`}
            >
              {platform.label}
            </Link>
          ))}
        </div>

        <section className={`grid gap-6 ${canEdit ? "xl:grid-cols-[1fr_360px]" : ""}`}>
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredStores.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                  {stores.length === 0
                    ? "还没有店铺，先在右侧创建一个平台店铺。"
                    : "当前平台筛选下没有店铺，切换平台或选择全部平台。"}
                </div>
              ) : (
                filteredStores.map((store) => (
                  <StoreSummaryCard
                    key={store.id}
                    store={store}
                    productCount={productsByStore.get(store.id) ?? 0}
                    selected={false}
                  />
                ))
              )}
              {unboundProducts > 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-amber-700" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-slate-950">未绑定店铺商品</p>
                      <p className="mt-1 text-xs text-amber-800">
                        {unboundProducts} 个商品需要补店铺归属
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {canEdit ? (
            <div className="flex flex-col gap-6">
              <div className="rounded-md border border-slate-200 bg-white p-5">
                <StoreCreateForm />
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
