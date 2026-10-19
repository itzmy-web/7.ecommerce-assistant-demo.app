import { ArrowRight } from "lucide-react";
import Link from "next/link";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * 渲染登录页面：与问题自检平台登录同构（深色圆角大卡 + 分段选择条 + 渐变激活胶囊
 * + 深灰输入框 + 协议勾选行 + 渐变 CTA + 虚线游客框 + 卡外小字），
 * 配色比参考图提亮：深蓝紫夜色背景 + 更鲜亮的蓝紫粉渐变。
 * 表单行为保持不变：仍然 POST 到 /login/submit，由后端完成认证并回写会话 Cookie。
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12 text-white"
      style={{
        background:
          "linear-gradient(155deg, #1b2030 0%, #171626 48%, #201a2e 100%)",
      }}
    >
      {/* 夜色氛围光：比参考图更亮一点的蓝紫/粉/青三色晕 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 50% 36% at 16% 6%, rgba(99,102,241,0.22), transparent 62%)",
            "radial-gradient(ellipse 44% 32% at 88% 10%, rgba(236,72,153,0.15), transparent 62%)",
            "radial-gradient(ellipse 52% 38% at 50% 106%, rgba(45,212,191,0.14), transparent 62%)",
          ].join(", "),
        }}
      />

      <section className="relative z-10 w-full max-w-md">
        <div className="rounded-[24px] border border-white/[0.08] bg-[#1e2130]/90 p-8 shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-9">
          <h1 className="text-3xl font-bold tracking-tight">欢迎使用数营参谋</h1>
          <p className="mt-2.5 text-[15px] text-slate-400">
            用数据辅助运营决策，为电商经营提供策略导航
          </p>

          {/* 分段选择条：内嵌深灰圆角条 + 渐变激活胶囊（对应参考图的 手机号/微信/支付宝） */}
          <div className="mt-7 flex items-center rounded-2xl bg-[#262a37] p-1.5">
            <span className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/25">
              <span aria-hidden="true">📧</span>
              邮箱登录
            </span>
            <span className="ml-auto pr-3 text-xs text-slate-500">手机号快捷登录即将上线</span>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              邮箱或密码不正确，或者账号已停用。
            </div>
          ) : null}

          <form action="/login/submit" method="post" className="mt-6 space-y-5">
            <div>
              <label htmlFor="login-email" className="text-sm text-slate-300">
                邮箱
              </label>
              <div className="mt-2 flex h-14 items-center rounded-2xl bg-[#262a37] px-4 transition focus-within:ring-2 focus-within:ring-violet-400/60">
                <span className="pr-3 text-sm font-medium text-slate-400">@</span>
                <span aria-hidden="true" className="h-6 w-px bg-white/10" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="h-full w-full bg-transparent pl-3 text-sm text-white outline-none placeholder:text-slate-500"
                  placeholder="请输入邮箱"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="text-sm text-slate-300">
                密码
              </label>
              <div className="mt-2 flex h-14 items-center rounded-2xl bg-[#262a37] px-4 transition focus-within:ring-2 focus-within:ring-violet-400/60">
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="h-full w-full text-sm text-white outline-none placeholder:text-slate-500"
                  placeholder="请输入密码"
                />
                <span className="whitespace-nowrap pl-3 text-xs text-slate-500">管理员开通</span>
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-400">
              <input
                type="checkbox"
                required
                className="mt-1 h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-[5px] border border-slate-500 bg-transparent transition checked:border-violet-500 checked:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-400/40"
              />
              <span>
                我已阅读并同意
                <span className="text-blue-400">《用户协议》</span>和
                <span className="text-blue-400">《隐私政策》</span>
                ，并授权使用本服务完成登录。
              </span>
            </label>

            <button
              type="submit"
              className="group inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-violet-500 to-pink-500 text-base font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:opacity-95 hover:shadow-violet-500/40 active:scale-[0.99]"
            >
              登录工作台
              <ArrowRight
                className="h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          </form>

          <p className="mt-3 text-center text-sm text-slate-500">
            登录凭据由工作台管理员统一开通
          </p>

          {/* 虚线游客框：对应参考图的「游客身份直接体验完整流程」 */}
          <Link
            href="/"
            className="mt-6 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-400/50 bg-blue-500/[0.07] px-4 py-4 text-center text-[15px] font-bold leading-relaxed text-white transition hover:border-blue-400 hover:bg-blue-500/[0.12]"
          >
            <span aria-hidden="true">👀</span>
            不填账号密码，点这里 → 首页随便逛逛
          </Link>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          未登录仅能浏览公开内容，登录后数据长期保存在云端
        </p>
      </section>
    </main>
  );
}
