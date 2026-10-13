"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * 登录页（演示版）：参照"电商运营橙色系"参考稿左右分栏布局——
 * 左侧品牌区（大标题 + 副标题 + 能力标签 + 插画感装饰），右侧白色登录卡（手机号/微信/支付宝三 tab）。
 * 表单行为不变：POST /login/submit（演示后端任意手机号均可登录，验证码前端模拟生成并自动填入）。
 * 2026-10-13 风格重做：深紫科技风 → 暖橙电商风，仅改样式不改逻辑。
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
      <div className="rounded-2xl border border-orange-100 bg-white p-2.5 shadow-lg shadow-orange-200/60">
        <div className="h-44 w-44">
          <FakeQr accent={isWechat ? "#07c160" : "#1677ff"} />
        </div>
      </div>
      <p className="text-sm text-slate-500">
        使用{isWechat ? "微信" : "支付宝"}扫一扫登录
      </p>
      <p className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs text-orange-600">
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
        <label className="text-sm text-slate-500">手机号</label>
        <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-orange-100 bg-[#faf6f1] px-3 transition focus-within:border-orange-400 focus-within:bg-white">
          <span className="text-sm text-slate-400">+86</span>
          <input
            name="phone"
            inputMode="numeric"
            maxLength={11}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder="请输入手机号"
            className="w-full bg-transparent py-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-slate-500">验证码</label>
        <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-orange-100 bg-[#faf6f1] px-3 transition focus-within:border-orange-400 focus-within:bg-white">
          <input
            name="code"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder={codeSent ? "验证码已自动填入" : "6 位验证码"}
            className="w-full bg-transparent py-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={sendCode}
            disabled={countdown > 0}
            className="shrink-0 bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-sm font-medium text-transparent disabled:bg-none disabled:text-slate-400"
          >
            {countdown > 0 ? `${countdown}s 后重发` : "获取验证码"}
          </button>
        </div>
      </div>

      <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-orange-500"
        />
        <span>
          我已阅读并同意 <span className="text-orange-600 underline underline-offset-2">《用户协议》</span> 与{" "}
          <span className="text-orange-600 underline underline-offset-2">《隐私政策》</span>
          ，并授权使用本服务完成注册 / 登录。
        </span>
      </label>

      {warn && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {warn}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-3 text-[15px] font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:opacity-95 active:scale-[0.99]"
      >
        登录 / 注册
      </button>

      <p className="text-xs leading-relaxed text-slate-400">
        当前为云端演示模式：验证码由前端自动生成并填入，任意手机号均可登录；正式版将启用真实短信/邮箱验证与企业级登录方式。
        <span className="mt-1 block text-slate-400">
          💡 若首次打开转圈或超时，是演示服务冷启动，刷新一次即可正常访问。
        </span>
      </p>

      <button
        type="submit"
        onClick={() => setAgreed(true)}
        className="w-full rounded-xl border border-dashed border-orange-400/60 bg-orange-50/70 px-4 py-3 text-center text-sm text-orange-600 transition hover:bg-orange-100/70"
      >
        🚀 不想输手机号？点这里 → 游客身份直接体验完整流程
      </button>
    </form>
  );
}

function LoginCard() {
  const [tab, setTab] = useState<LoginTab>("phone");

  return (
    <div className="w-full max-w-[420px] rounded-[24px] border border-orange-100/80 bg-white/95 p-8 text-slate-900 shadow-[0_28px_80px_rgba(234,88,12,0.18)] backdrop-blur-xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">欢迎使用电商运营助手</h1>
      <p className="mt-2 text-sm text-slate-500">
        登录后即可管理店铺、查看数据看板与 AI 数字人
        <span className="mt-1 block text-xs text-slate-400">
          演示环境中游客与验证码登录能力一致；数据为公共模拟数据，请勿输入真实业务信息。
        </span>
      </p>

      <div className="mt-6 flex items-center rounded-2xl border border-orange-100 bg-orange-50/70 p-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm transition ${
              tab === t.key
                ? "bg-gradient-to-r from-orange-500 to-red-500 font-semibold text-white shadow-md shadow-orange-500/25"
                : "text-slate-500 hover:text-slate-800"
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
          <p className="mb-3 rounded-lg border border-orange-100 bg-orange-50/70 px-3 py-2 text-xs text-slate-500">
            演示流程：二维码为模拟样式，扫码动作不会被真实校验。
          </p>
          <QrPanel kind="wechat" />
        </div>
      )}
      {tab === "alipay" && (
        <div className="mt-6">
          <p className="mb-3 rounded-lg border border-orange-100 bg-orange-50/70 px-3 py-2 text-xs text-slate-500">
            演示流程：二维码为模拟样式，扫码动作不会被真实校验。
          </p>
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
    <p className="mb-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-sm text-rose-600">
      登录失败，请重试
    </p>
  );
}

/** 品牌区插画：橙色系层叠卡片 + 金币 + 对话气泡的纯 CSS 装饰组合（呼应参考稿 3D 电商插画）。 */
function BrandArt() {
  return (
    <div aria-hidden="true" className="relative mt-8 h-44 w-full max-w-sm select-none">
      {/* 底层卡片 */}
      <div className="absolute bottom-2 left-0 h-24 w-40 rotate-[-8deg] rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 shadow-xl shadow-orange-300/50" />
      {/* 中层卡片 */}
      <div className="absolute bottom-6 left-16 h-28 w-44 rotate-[5deg] rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 shadow-xl shadow-orange-300/50">
        <div className="mt-3 ml-4 h-2.5 w-20 rounded-full bg-white/70" />
        <div className="mt-2 ml-4 h-2.5 w-14 rounded-full bg-white/45" />
        <div className="mt-4 ml-4 inline-block rounded-full bg-red-600 px-3 py-1 text-[11px] font-semibold text-white">¥ 运营任务卡</div>
      </div>
      {/* 顶层小卡 */}
      <div className="absolute bottom-14 left-40 h-20 w-36 rotate-[-3deg] rounded-2xl border border-orange-100 bg-white/95 shadow-lg shadow-orange-200/60">
        <div className="mt-3 ml-4 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="h-2 w-2 rounded-full bg-red-400" />
        </div>
        <div className="mt-2.5 ml-4 h-2 w-24 rounded-full bg-slate-200" />
        <div className="mt-1.5 ml-4 h-2 w-16 rounded-full bg-orange-200" />
      </div>
      {/* 金币 */}
      <div className="absolute -top-1 right-16 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-lg font-black text-white shadow-lg shadow-orange-300/60">¥</div>
      <div className="absolute top-14 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-orange-400 text-sm font-black text-white shadow-md shadow-orange-200/60">¥</div>
      {/* 对话气泡 */}
      <div className="absolute -bottom-2 right-10 rounded-2xl rounded-br-sm bg-white px-4 py-2 text-xs font-medium text-orange-600 shadow-lg shadow-orange-200/70">
        AI 帮你盯数据 💬
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10 text-slate-900 lg:justify-between lg:gap-14 lg:px-16"
      style={{
        background: "linear-gradient(150deg, #fdf5ee 0%, #fcebdd 48%, #f9dcc8 100%)",
      }}
    >
      {/* 背景装饰：暖橙光斑 + 虚化卡片，呼应参考稿拼贴底图 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 46% 38% at 10% 6%, rgba(234,88,12,0.14), transparent 62%)",
            "radial-gradient(ellipse 40% 32% at 92% 10%, rgba(249,115,22,0.12), transparent 62%)",
            "radial-gradient(ellipse 48% 40% at 50% 110%, rgba(239,68,68,0.10), transparent 62%)",
          ].join(", "),
        }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rotate-12 rounded-3xl bg-gradient-to-br from-orange-300/30 to-red-400/20 blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 bottom-10 h-72 w-72 -rotate-6 rounded-3xl bg-gradient-to-br from-amber-300/30 to-orange-400/20 blur-2xl" />

      {/* 左栏：品牌区（小屏隐藏，避免挤压登录卡） */}
      <section className="relative z-10 hidden max-w-xl flex-col lg:flex">
        <h2 className="text-5xl font-black leading-tight tracking-tight text-[#331b0e]">
          电商运营助手
        </h2>
        <p className="mt-3 text-lg font-medium text-[#8a5a3b]">
          商品、活动与内容运营任务平台
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="rounded-md bg-gradient-to-r from-orange-500 to-red-500 px-3.5 py-1.5 text-sm font-semibold text-white shadow-md shadow-orange-400/40">
            任务分发
          </span>
          <span className="rounded-md border border-orange-300 bg-white/80 px-3.5 py-1.5 text-sm font-semibold text-orange-600">
            商品优化
          </span>
          <span className="rounded-md border border-orange-300 bg-white/80 px-3.5 py-1.5 text-sm font-semibold text-orange-600">
            活动跟进
          </span>
        </div>

        <BrandArt />

        <p className="mt-7 flex items-center gap-2 text-sm font-medium tracking-wide text-[#8a5a3b]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-600" aria-hidden="true" />
          统一企业级 SaaS 体系
        </p>

        {/* 概念原型免责块（醒目位置，非页脚小字）：区分产品规划与演示现实 */}
        <div className="mt-4 rounded-2xl border border-amber-300/70 bg-amber-50/90 px-5 py-4">
          <p className="text-sm font-semibold text-amber-700">⚠️ 本页面为产品概念演示原型</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-amber-700/85">
            以下指标为产品设计规划目标；演示环境为交互原型 + 模拟数据，
            不具备真实修改店铺、执行投放、修改库存的能力，也不会调用任何外部平台接口。
          </p>
        </div>

        <p className="mt-6 text-xs font-medium tracking-wide text-[#8a5a3b]">
          产品规划指标
        </p>
        <div className="mt-2 grid grid-cols-4 gap-3">
          {[
            ["9+", "AI Agent"],
            ["17", "受控工具"],
            ["7", "大工作流"],
            ["7×24", "任务调度（生产版）"],
          ].map(([num, label]) => (
            <div
              key={label}
              className="rounded-2xl border border-orange-100 bg-white/80 px-4 py-3.5 shadow-sm shadow-orange-100/60"
            >
              <div className="bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
                {num}
              </div>
              <div className="mt-1 text-xs text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          <div className="rounded-2xl border border-orange-100 bg-white/80 px-5 py-4 shadow-sm shadow-orange-100/60">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
              <span aria-hidden="true">📥</span> 一键导入，自动建档
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              支持商品 / SKU / 库存流水批量导入，字段映射可视化，自动建库建档、数据校验。
            </p>
          </div>
          <div className="rounded-2xl border border-orange-100 bg-white/80 px-5 py-4 shadow-sm shadow-orange-100/60">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
              <span aria-hidden="true">🤖</span> AI Agent 全自动执行
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
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
          <p className="mt-5 text-center text-xs text-slate-400">
            演示版 · 数据为模拟数据 · 登录即代表同意演示协议
          </p>
        </div>
      </section>
    </main>
  );
}
