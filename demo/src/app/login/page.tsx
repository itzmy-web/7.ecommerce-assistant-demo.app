"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * 登录页（演示版）：参照"掌柜智库"式左右分栏布局——
 * 左侧项目卖点（大标题 + 数据带 + 功能卡），右侧登录卡（手机号/微信/支付宝三 tab）。
 * 表单行为不变：POST /login/submit（演示后端任意手机号均可登录，验证码前端模拟生成并自动填入）。
 */

type LoginTab = "phone" | "wechat" | "alipay";

const TABS: Array<{ key: LoginTab; icon: string; label: string }> = [
  { key: "phone", icon: "📱", label: "手机号" },
  { key: "wechat", icon: "💬", label: "微信" },
  { key: "alipay", icon: "🅰️", label: "支付宝" },
];

/** 伪二维码：固定种子的 21×21 点阵 + 三个定位角，纯装饰占位。 */
function FakeQr({ accent }: { accent: string }) {
  const cells = useMemo(() => {
    const grid: boolean[] = [];
    let seed = 20261011;
    for (let i = 0; i < 21 * 21; i++) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      grid.push(seed % 100 < 46);
    }
    const finder = (r0: number, c0: number) => {
      for (let r = 0; r < 7; r++)
        for (let c = 0; c < 7; c++) {
          const edge = r === 0 || r === 6 || c === 0 || c === 6;
          const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          grid[(r0 + r) * 21 + (c0 + c)] = edge || core;
        }
    };
    finder(0, 0);
    finder(0, 14);
    finder(14, 0);
    return grid;
  }, []);

  return (
    <svg viewBox="0 0 21 21" className="h-full w-full" aria-hidden="true">
      <rect width="21" height="21" fill="white" rx="1.5" />
      {cells.map((on, i) =>
        on ? (
          <rect
            key={i}
            x={i % 21}
            y={Math.floor(i / 21)}
            width="0.92"
            height="0.92"
            fill={accent}
          />
        ) : null,
      )}
    </svg>
  );
}

function QrPanel({ kind }: { kind: "wechat" | "alipay" }) {
  const isWechat = kind === "wechat";
  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="rounded-2xl bg-white p-2.5 shadow-lg shadow-black/30">
        <div className="h-44 w-44">
          <FakeQr accent={isWechat ? "#07c160" : "#1677ff"} />
        </div>
      </div>
      <p className="text-sm text-slate-300">
        使用{isWechat ? "微信" : "支付宝"}扫一扫登录
      </p>
      <p className="rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs text-amber-300/90">
        演示版为占位二维码，暂不可扫码 · 请切换到「手机号」登录
      </p>
    </div>
  );
}

function PhoneForm() {
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [warn, setWarn] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const sendCode = () => {
    if (countdown > 0) return;
    if (!/^1\d{10}$/.test(phone)) {
      setWarn("请先输入 11 位手机号");
      return;
    }
    setWarn(null);
    const mockCode = String(Math.floor(100000 + Math.random() * 900000));
    setCode(mockCode);
    setCodeSent(true);
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((s) => {
        if (s <= 1 && timerRef.current) clearInterval(timerRef.current);
        return s - 1;
      });
    }, 1000);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!agreed) {
      e.preventDefault();
      setWarn("请先勾选同意《用户协议》与《隐私政策》");
      return;
    }
    setWarn(null);
  };

  return (
    <form action="/login/submit" method="post" onSubmit={onSubmit} className="mt-6 space-y-5">
      <input type="hidden" name="password" value="demo-not-real" />
      <input type="hidden" name="email" value={`${phone || "guest"}@phone.demo`} />

      <div>
        <label className="text-sm text-slate-400">手机号</label>
        <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-white/10 bg-[#262a37] px-3 focus-within:border-violet-400/60">
          <span className="text-sm text-slate-500">+86</span>
          <input
            name="phone"
            inputMode="numeric"
            maxLength={11}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder="请输入手机号"
            className="w-full bg-transparent py-3 text-[15px] text-white outline-none placeholder:text-slate-500"
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-slate-400">验证码</label>
        <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-white/10 bg-[#262a37] px-3 focus-within:border-violet-400/60">
          <input
            name="code"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder={codeSent ? "验证码已自动填入" : "6 位验证码"}
            className="w-full bg-transparent py-3 text-[15px] text-white outline-none placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={sendCode}
            disabled={countdown > 0}
            className="shrink-0 bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-sm font-medium text-transparent disabled:bg-none disabled:text-slate-500"
          >
            {countdown > 0 ? `${countdown}s 后重发` : "获取验证码"}
          </button>
        </div>
      </div>

      <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-400">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-violet-500"
        />
        <span>
          我已阅读并同意 <span className="text-violet-300 underline underline-offset-2">《用户协议》</span> 与{" "}
          <span className="text-violet-300 underline underline-offset-2">《隐私政策》</span>
          ，并授权使用本服务完成注册 / 登录。
        </span>
      </label>

      {warn && (
        <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
          {warn}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-xl bg-gradient-to-r from-blue-500 via-violet-500 to-pink-500 py-3 text-[15px] font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:opacity-95 active:scale-[0.99]"
      >
        登录 / 注册
      </button>

      <p className="text-xs leading-relaxed text-slate-500">
        当前为云端演示模式：验证码由前端自动生成并填入，任意手机号均可登录。
        <span className="mt-1 block text-slate-500">
          💡 若首次打开转圈或超时，是演示服务冷启动，刷新一次即可正常访问。
        </span>
      </p>

      <button
        type="submit"
        onClick={() => setAgreed(true)}
        className="w-full rounded-xl border border-dashed border-sky-400/40 bg-sky-400/[0.06] px-4 py-3 text-center text-sm text-sky-300 transition hover:bg-sky-400/10"
      >
        🚀 不想输手机号？点这里 → 游客身份直接体验完整流程
      </button>
    </form>
  );
}

function LoginCard() {
  const [tab, setTab] = useState<LoginTab>("phone");

  return (
    <div className="w-full max-w-[420px] rounded-[24px] border border-white/[0.08] bg-[#1e2130]/90 p-8 shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <h1 className="text-2xl font-bold tracking-tight text-white">欢迎使用电商运营助手</h1>
      <p className="mt-2 text-sm text-slate-400">登录后即可管理店铺、查看数据看板与 AI 数字人</p>

      <div className="mt-6 flex items-center rounded-2xl bg-[#262a37] p-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm transition ${
              tab === t.key
                ? "bg-gradient-to-r from-blue-500 to-violet-500 font-semibold text-white shadow-md shadow-violet-500/25"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "phone" && <PhoneForm />}
      {tab === "wechat" && (
        <div className="mt-6">
          <QrPanel kind="wechat" />
        </div>
      )}
      {tab === "alipay" && (
        <div className="mt-6">
          <QrPanel kind="alipay" />
        </div>
      )}
    </div>
  );
}

function LoginError() {
  const params = useSearchParams();
  if (!params.get("error")) return null;
  return (
    <p className="mb-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2.5 text-sm text-rose-300">
      登录失败，请重试
    </p>
  );
}

export default function LoginPage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10 text-white lg:justify-between lg:gap-14 lg:px-16"
      style={{
        background: "linear-gradient(155deg, #10131d 0%, #171626 52%, #1c1530 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 48% 40% at 12% 4%, rgba(99,102,241,0.20), transparent 62%)",
            "radial-gradient(ellipse 42% 34% at 90% 8%, rgba(236,72,153,0.13), transparent 62%)",
            "radial-gradient(ellipse 50% 40% at 46% 108%, rgba(45,212,191,0.12), transparent 62%)",
          ].join(", "),
        }}
      />

      {/* 左栏：项目卖点（小屏隐藏，避免挤压登录卡） */}
      <section className="relative z-10 hidden max-w-xl flex-col lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-xl shadow-lg shadow-violet-600/30">
            🛍️
          </span>
          <span className="text-xl font-bold">电商运营助手</span>
        </div>
        <p className="mt-3 inline-flex w-fit items-center rounded-full border border-white/15 px-3 py-1 text-[11px] tracking-[0.18em] text-slate-400">
          AI ECOMMERCE OPERATION WORKBENCH · DEMO
        </p>

        <h2 className="mt-6 text-5xl font-black leading-[1.15] tracking-tight">
          把商品数据，
          <br />
          变成
          <span className="bg-gradient-to-r from-sky-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
            会自己运营
          </span>
          的智能工作台
        </h2>

        <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-slate-400">
          商品 / 店铺 / 库存一站式管理；AI Agent 自动诊断商品、产出创意方案、执行投放实验，
          高风险操作分级管控并需人工审批。让运营真正跑在自动化的轨道上。
        </p>

        <div className="mt-7 grid grid-cols-4 gap-3">
          {[
            ["9+", "AI Agent"],
            ["17", "受控工具"],
            ["7", "大工作流"],
            ["24h", "全天候执行"],
          ].map(([num, label]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 py-3.5"
            >
              <div className="text-2xl font-extrabold tracking-tight">{num}</div>
              <div className="mt-1 text-xs text-slate-400">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] px-5 py-4">
            <div className="flex items-center gap-2 text-[15px] font-semibold">
              <span aria-hidden="true">📥</span> 一键导入，自动建档
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
              支持商品 / SKU / 库存流水批量导入，字段映射可视化，自动建库建档、数据校验。
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] px-5 py-4">
            <div className="flex items-center gap-2 text-[15px] font-semibold">
              <span aria-hidden="true">🤖</span> AI Agent 全自动执行
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
              诊断 → 创意 → 质检（LLM 评审）→ 人工审批 全链路留痕，高风险操作分级管控。
            </p>
          </div>
        </div>
      </section>

      {/* 右栏：登录卡 */}
      <section className="relative z-10 flex w-full justify-center lg:w-auto">
        <div className="w-full max-w-[420px]">
          <Suspense fallback={null}>
            <LoginError />
          </Suspense>
          <LoginCard />
          <p className="mt-5 text-center text-xs text-slate-500">
            演示版 · 数据为模拟数据 · 登录即代表同意演示协议
          </p>
        </div>
      </section>
    </main>
  );
}
