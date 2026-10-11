import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { API_BASE_URL } from "@/lib/api";
import { authHeaders } from "@/lib/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * 处理店铺授权表单请求：_action=grant 走 PUT upsert（按邮箱授权/改角色），
 * _action=revoke 走 DELETE（按 user_id 撤销）；完成后重定向回店铺详情页并带上结果状态。
 */
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const formData = await request.formData();
  const action = formData.get("_action")?.toString() ?? "grant";

  const response =
    action === "revoke"
      ? await fetch(`${API_BASE_URL}/api/v1/stores/${id}/grants/${formData.get("user_id")?.toString() ?? ""}`, {
          method: "DELETE",
          headers: await authHeaders(),
        })
      : await fetch(`${API_BASE_URL}/api/v1/stores/${id}/grants`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({
            user_email: formData.get("user_email")?.toString() ?? "",
            role: formData.get("role")?.toString() ?? "viewer",
          }),
        });

  revalidatePath(`/stores/${id}`);
  const status =
    action === "revoke" ? (response.ok ? "revoked" : "revoke_failed") : response.ok ? "saved" : "failed";
  redirect(`/stores/${id}?grant=${status}`);
}
