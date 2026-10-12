import { UserRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DigitalHumanPanel } from "@/components/digital-human-panel";
import { getDigitalHumanCredentials } from "@/lib/api";
import { getAuthToken } from "@/lib/session";

/**
 * 渲染数字人页面：登录后服务端获取魔珐星云凭证，交给客户端面板驱动 SDK。
 * 凭证未配置时给出引导，而不是让用户面对一个连不上的黑屏。
 */
export default async function DigitalHumanPage() {
  const token = await getAuthToken();
  if (!token) {
    redirect("/login");
  }

  const credentials = await getDigitalHumanCredentials();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <UserRound className="h-6 w-6 text-violet-600" />
            AI 数字人
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            魔珐星云 3D 数字人：连接后可驱动 TA 朗读任意文案，用于店铺播报与运营演示。
          </p>
        </div>
      </header>

      {credentials ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <DigitalHumanPanel credentials={credentials} />
        </section>
      ) : (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <h2 className="text-lg font-semibold text-amber-800">数字人还未配置</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-amber-700">
            需要到魔珐星云平台（xingyun3d.com）注册并创建「具身驱动应用」，拿到 App ID 与
            App Secret 后，填写到项目根目录 <code>.env</code> 的
            <code className="mx-1">DIGITAL_HUMAN_APP_ID</code> /
            <code className="mx-1">DIGITAL_HUMAN_APP_SECRET</code>
            两项，再重启 api 服务即可。
          </p>
        </section>
      )}
    </main>
  );
}
