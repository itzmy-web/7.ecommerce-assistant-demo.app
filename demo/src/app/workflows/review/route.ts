import { NextResponse } from "next/server";

import { getProducts } from "@/lib/api";

/** 「周期复盘」入口：侧栏任务栏直达首个商品的复盘标签页。 */
export async function GET(request: Request) {
  const products = await getProducts();
  const target = products[0] ? `/products/${products[0].id}?tab=review` : "/products";
  return NextResponse.redirect(new URL(target, request.url), 307);
}
