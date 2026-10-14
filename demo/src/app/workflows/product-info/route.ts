import { getProducts } from "@/lib/api";

/**
 * 「补商品信息」入口：侧栏任务栏直达首个商品的运营闭环（overview 标签）。
 * 2026-10-14：原首页功能卡的 deep link 改为固定路由，保证侧栏链接稳定、行为与拆分前一致。
 * 注意：Location 使用相对路径——线上经反向代理后 request.url 是内部地址（localhost:3000），
 * 用绝对地址会把用户跳到 localhost，必须让浏览器基于当前域名解析。
 */
export async function GET() {
  const products = await getProducts();
  const target = products[0] ? `/products/${products[0].id}?tab=overview` : "/products";
  return new Response(null, { status: 307, headers: { Location: target } });
}
