import { NextResponse } from "next/server";

import { getProducts } from "@/lib/api";

/**
 * 「补商品信息」入口：侧栏任务栏直达首个商品的运营闭环（overview 标签）。
 * 2026-10-14：原首页功能卡的 deep link 改为固定路由，保证侧栏链接稳定、行为与拆分前一致。
 */
export async function GET(request: Request) {
  const products = await getProducts();
  const target = products[0] ? `/products/${products[0].id}?tab=overview` : "/products";
  return NextResponse.redirect(new URL(target, request.url), 307);
}
