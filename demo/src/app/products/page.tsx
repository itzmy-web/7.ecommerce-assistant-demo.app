import { Boxes, Store as StoreIcon } from "lucide-react";
import Link from "next/link";

import { ProductCreateForm } from "@/components/product-create-form";
import {
  ProductRow,
  parsePlatform,
  parseStoreId,
  platformFilters,
} from "@/components/workspace-view";
import { getCurrentUser, getProducts, getStores } from "@/lib/api";
import { getAuthToken } from "@/lib/session";

type ProductsProps = {
  searchParams?: Promise<{ platform?: string; store?: string }>;
};

/**
 * 商品池页：从原首页「商品池」块独立出来的功能页。
 * 保留平台 + 店铺双重筛选、商品行（进入单品运营闭环）与新建商品表单，行为与拆分前一致。
 */
export default async function ProductsPage({ searchParams }: ProductsProps) {
  const query = searchParams ? await searchParams : {};
  const selectedPlatform = parsePlatform(query.platform);
  const selectedStoreId = parseStoreId(query.store);
  const [products, stores, token] = await Promise.all([getProducts(), getStores(), getAuthToken()]);
  const currentUser = token ? await getCurrentUser(token) : null;
  const canEdit = Boolean(currentUser?.permissions.can_edit);

  const storeById = new Map(stores.map((store) => [store.id, store]));
  const filteredProducts = products.filter((product) => {
    if (selectedPlatform !== "all" && product.platform !== selectedPlatform) {
      return false;
    }
    if (selectedStoreId !== null && product.store_id !== selectedStoreId) {
      return false;
    }
    return true;
  });

  const selectedStore = selectedStoreId !== null ? storeById.get(selectedStoreId) : null;

  /** 平台筛选链接：保留店铺筛选条件。 */
  const platformHref = (value: "all" | string) => {
    const params = new URLSearchParams();
    if (value !== "all") params.set("platform", value);
    if (selectedStoreId !== null) params.set("store", String(selectedStoreId));
    const qs = params.toString();
    return qs ? `/products?${qs}` : "/products";
  };

  /** 店铺筛选链接：保留平台筛选条件。 */
  const storeHref = (value: number | null) => {
    const params = new URLSearchParams();
    if (selectedPlatform !== "all") params.set("platform", selectedPlatform);
    if (value !== null) params.set("store", String(value));
    const qs = params.toString();
    return qs ? `/products?${qs}` : "/products";
  };

  return (
    <main className="min-h-screen bg-[#f7f8fb] px-5 py-6 text-slate-950 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-orange-600">Ecommerce Operation Assistant</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
              商品池
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              围绕每个商品补竞品、出素材、做投放实验和复盘 · 当前展示 {filteredProducts.length} / {products.length} 个商品
              {selectedStore ? `（店铺：${selectedStore.name}）` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/stores"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-orange-200 bg-white px-3 text-sm font-medium text-orange-600 hover:bg-orange-50"
            >
              <StoreIcon className="h-4 w-4" aria-hidden="true" />
              店铺管理
            </Link>
            <Link
              href="/imports"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-gradient-to-r from-orange-500 to-red-500 px-3 text-sm font-medium text-white shadow-sm shadow-orange-500/25 hover:opacity-95"
            >
              <Boxes className="h-4 w-4" aria-hidden="true" />
              批量导入商品
            </Link>
          </div>
        </header>

        {!canEdit ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
            当前账号为只读权限，只能查看商品数据，不能新建商品。
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {platformFilters.map((platform) => (
            <Link
              key={platform.value}
              href={platformHref(platform.value)}
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

        {stores.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">按店铺：</span>
            <Link
              href={storeHref(null)}
              className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium ${
                selectedStoreId === null
                  ? "border-orange-400 bg-orange-50 text-orange-600"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-orange-50"
              }`}
            >
              全部店铺
            </Link>
            {stores.map((store) => (
              <Link
                key={store.id}
                href={storeHref(store.id)}
                className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium ${
                  selectedStoreId === store.id
                    ? "border-orange-400 bg-orange-50 text-orange-600"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-orange-50"
                }`}
              >
                {store.name}
              </Link>
            ))}
          </div>
        ) : null}

        <section className={`grid gap-6 ${canEdit ? "xl:grid-cols-[1fr_360px]" : ""}`}>
          <div>
            {/* 商品池表格 */}
            <section className="rounded-md border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">商品池</h2>
                  <p className="mt-1 text-sm text-slate-500">点击「进入」打开单品运营闭环</p>
                </div>
                <span className="inline-flex h-8 items-center gap-1.5 rounded-md bg-orange-50 px-3 text-xs font-medium text-orange-600">
                  <Boxes className="h-3.5 w-3.5" aria-hidden="true" />
                  {filteredProducts.length} / {products.length}
                </span>
              </div>

              <div className="mt-5 overflow-hidden rounded-md border border-slate-200">
                <div className="hidden grid-cols-[1.3fr_0.9fr_0.8fr_0.7fr_1fr_96px] bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 lg:grid">
                  <span>商品</span>
                  <span>店铺</span>
                  <span>平台</span>
                  <span>售价</span>
                  <span>卖点</span>
                  <span>动作</span>
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="px-4 py-12 text-center text-sm text-slate-500">
                    当前筛选下没有商品，可以新建商品或切换筛选条件。
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {filteredProducts.map((product) => (
                      <ProductRow
                        key={product.id}
                        product={product}
                        store={product.store_id ? storeById.get(product.store_id) : null}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {canEdit ? (
            <div className="flex flex-col gap-6">
              <div className="rounded-md border border-slate-200 bg-white p-5">
                <ProductCreateForm stores={stores} />
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
