import { API_BASE_URL } from "@/lib/api";
import { authHeaders } from "@/lib/session";

/**
 * 处理侧栏徽标汇总请求：把后端轻量计数转交给全局导航，用于展示各功能模块的实时规模。
 */
export async function GET() {
  const response = await fetch(`${API_BASE_URL}/api/v1/workspace/sidebar-summary`, {
    headers: await authHeaders(),
    cache: "no-store",
  });
  return new Response(await response.text(), {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
  });
}
