import { API_BASE_URL } from "@/lib/api";
import { authHeaders } from "@/lib/session";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

/**
 * 处理Agent运行事件流请求：把后端 SSE（text/event-stream）以二进制流原样透传给浏览器，
 * 避免在 BFF 层缓冲或改写事件帧；认证与 Workspace 上下文仍由服务端注入。
 */
export async function GET(_request: Request, context: RouteContext) {
  const { runId } = await context.params;
  const upstream = await fetch(
    `${API_BASE_URL}/api/v1/agent-runs/${runId}/events/stream`,
    {
      headers: await authHeaders(),
      cache: "no-store",
    },
  );
  if (!upstream.ok || !upstream.body) {
    return new Response(JSON.stringify({ detail: `事件流上游不可用（${upstream.status}）` }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
