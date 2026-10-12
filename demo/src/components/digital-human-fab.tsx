"use client";

import { UserRound, X } from "lucide-react";
import { useState } from "react";

import { DigitalHumanPanel } from "@/components/digital-human-panel";
import type { DigitalHumanCredentials } from "@/types";

type CredentialsState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; credentials: DigitalHumanCredentials }
  | { kind: "unconfigured"; message: string }
  | { kind: "error"; message: string };

/**
 * 渲染 DigitalHumanFab 组件：常驻右下角的数字人悬浮球，收起时不占页面空间；
 * 展开后加载完整数字人面板。挂在 AppShell 中，切换页面时组件不卸载，
 * 数字人连接保持不断。
 */
export function DigitalHumanFab() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<CredentialsState>({ kind: "idle" });

  /** 首次展开时拉取数字人凭证；后续展开复用已获取结果。 */
  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || state.kind !== "idle") return;
    setState({ kind: "loading" });
    try {
      const response = await fetch("/digital-human/credentials", { cache: "no-store" });
      const payload = (await response.json()) as DigitalHumanCredentials & { detail?: string };
      if (!response.ok) {
        setState({ kind: "unconfigured", message: payload.detail ?? "数字人凭证未配置" });
        return;
      }
      setState({ kind: "ready", credentials: payload });
    } catch {
      setState({ kind: "error", message: "凭证获取失败，请确认后端服务已启动。" });
    }
  }

  return (
    <>
      {/* 悬浮球本体 */}
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? "收起数字人" : "展开数字人"}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-300/50 transition hover:scale-105 hover:shadow-violet-400/60 print:hidden"
      >
        {open ? <X className="h-6 w-6" aria-hidden="true" /> : <UserRound className="h-7 w-7" aria-hidden="true" />}
        {!open ? (
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" aria-hidden="true" />
        ) : null}
      </button>

      {/* 展开面板 */}
      {open ? (
        <div className="fixed bottom-24 right-6 z-40 w-[min(92vw,880px)] print:hidden">
          <div className="max-h-[78vh] overflow-y-auto rounded-2xl border border-violet-100 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">AI 数字人运营搭档</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {state.kind === "ready"
                    ? "连接保持中，切换页面不会断开。"
                    : "连接 3D 数字人后，可驱动 TA 播报店铺运营文案。"}
                </p>
              </div>
              <button
                type="button"
                onClick={toggle}
                aria-label="收起数字人"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {state.kind === "ready" ? (
              <DigitalHumanPanel credentials={state.credentials} />
            ) : (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  state.kind === "loading"
                    ? "border-slate-200 bg-slate-50 text-slate-600"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                {state.kind === "loading"
                  ? "正在获取数字人凭证…"
                  : state.kind === "unconfigured"
                    ? `${state.message}。需要到魔珐星云平台（xingyun3d.com）创建「具身驱动应用」，把 App ID / App Secret 填入项目 .env 的 DIGITAL_HUMAN_APP_ID / DIGITAL_HUMAN_APP_SECRET 后重启 api 服务。`
                    : state.kind === "error"
                      ? state.message
                      : ""}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
