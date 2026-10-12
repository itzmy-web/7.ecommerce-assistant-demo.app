"use client";

import { ChevronDown, ChevronUp, UserRound } from "lucide-react";
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
 * 渲染 DigitalHumanBar 组件：常驻每个任务页面顶部的数字人横条，
 * 收起时只占一行，展开后加载完整数字人面板；挂在 AppShell 中，
 * 切换页面时组件不卸载，数字人连接保持不断。
 */
export function DigitalHumanBar() {
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
    <section className="border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-cyan-50 print:hidden">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2.5 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">AI 数字人运营搭档</p>
            <p className="truncate text-xs text-slate-500">
              {state.kind === "ready"
                ? open
                  ? "已展开，可连接并驱动数字人播报。"
                  : "连接保持中，切换页面不会断开。"
                : "展开后可连接 3D 数字人，驱动 TA 播报店铺运营文案。"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 text-sm font-medium text-violet-700 transition hover:bg-violet-50"
        >
          {open ? (
            <>
              收起
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </>
          ) : (
            <>
              展开数字人
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>

      {open ? (
        <div className="mx-auto w-full max-w-7xl px-4 pb-5 lg:px-8">
          {state.kind === "ready" ? (
            <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
              <DigitalHumanPanel credentials={state.credentials} />
            </div>
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
      ) : null}
    </section>
  );
}
