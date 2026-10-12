import { API_BASE_URL } from "@/lib/api";
import { authHeaders } from "@/lib/session";

/**
 * 处理数字人凭证读取请求：把后端下发的魔珐星云凭证转交给客户端顶部横条，
 * 未配置（503）等状态原样透传，由前端给出引导文案。
 */
export async function GET() {
  const response = await fetch(`${API_BASE_URL}/api/v1/digital-human/credentials`, {
    headers: await authHeaders(),
    cache: "no-store",
  });
  return new Response(await response.text(), {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
  });
}
