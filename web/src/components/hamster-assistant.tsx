"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type ChatMessage = {
  role: "hamster" | "user";
  text: string;
};

/** 关键词问答表：轻量意图匹配，命中即回；未命中走兜底话术。 */
const QA_RULES: Array<{ keywords: string[]; reply: string }> = [
  { keywords: ["你好", "hello", "hi", "在吗"], reply: "吱吱！我是仓鼠助手栗子，搬运商品数据是我的强项～有什么想看的吗？" },
  { keywords: ["库存", "缺货", "补货"], reply: "吱！去「数据看板」能看低库存预警，店铺详情页里还有 AI 补货建议哦。" },
  { keywords: ["诊断", "分析"], reply: "吱吱～在商品详情页发起 Agent 任务，诊断→创意→质检→人工审批，全程可看实时事件流！" },
  { keywords: ["审批", "风险"], reply: "高风险操作都会停在审批队列等你拍板，Agent 中心能看到风险等级标识（R0~R3）。" },
  { keywords: ["看板", "数据", "报表"], reply: "「数据看板」汇总了商品、库存、创意和审批指标，还能一键导出打印版报告！" },
  { keywords: ["导入", "csv", "模板"], reply: "「导入中心」支持商品 / SKU / 经营数据批量导入，附赠字段映射和模板下载～" },
  { keywords: ["数字人", "仓鼠", "你是谁"], reply: "我就是本店吉祥物兼运营搭档栗子！枫叶是我的劳动勋章 🍁" },
  { keywords: ["笑话", "讲一个"], reply: "吱吱：为什么仓鼠不做电商？——因为 cheeks（腮帮/支票）总是装不下那么多货！🍁" },
];

const FALLBACK_REPLY = "吱吱…这个问题超出了我的腮帮容量！试试问我：库存、诊断、审批、导入、看板？";

const TIPS = [
  "🍁 点我可以问运营问题，也可以让我念出来～",
  "📊 「数据看板」里的低库存数如果亮了，记得去补货！",
  "🤖 Agent 中心可以发起商品诊断，全过程实时可看。",
  "🏪 店铺详情页可以给成员单独授权店铺权限哦。",
];

/** 用浏览器语音合成念文本；不可用时静默跳过。 */
function speak(text: string) {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  } catch {
    // 语音不可用不影响文字交互。
  }
}

function matchReply(input: string) {
  const text = input.trim().toLowerCase();
  const hit = QA_RULES.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)));
  return hit ? hit.reply : FALLBACK_REPLY;
}

/**
 * 渲染 HamsterAssistant 组件：右下角 2D 可动仓鼠助手（替代 3D 数字人悬浮球）。
 * 眨眼 / 浮动 / 挥枫叶动画；点击展开互动面板，支持关键词问答、快捷跳转与语音朗读。
 * 挂在 AppShell 中跨页面常驻，不依赖任何外部 SDK。
 */
export function HamsterAssistant() {
  const [open, setOpen] = useState(false);
  const [waving, setWaving] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "hamster", text: "吱吱！我是仓鼠助手栗子 🍁 点下面的快捷按钮，或直接问我运营问题～" },
  ]);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setTipIndex((current) => (current + 1) % TIPS.length), 6000);
    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  /** 摸摸头：仓鼠开心跳一下 + 随机夸奖 + 语音。 */
  const pet = useCallback(() => {
    setWaving(true);
    window.setTimeout(() => setWaving(false), 900);
    const praises = ["吱吱～最舒服的摸头！🍁", "呜哇，毛都顺了，谢谢老板！", "再摸就要掉枫叶啦～"];
    const reply = praises[Math.floor(Math.random() * praises.length)];
    setMessages((current) => [...current, { role: "hamster", text: reply }]);
    speak(reply);
  }, []);

  const ask = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const reply = matchReply(text);
    setMessages((current) => [...current, { role: "user", text }, { role: "hamster", text: reply }]);
    setInput("");
  }, [input]);

  return (
    <>
      {/* 悬浮仓鼠本体：呼吸浮动 + 点按挥手 */}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "收起仓鼠助手" : "展开仓鼠助手"}
        className="fixed bottom-12 right-5 z-40 block h-[76px] w-[76px] rounded-full shadow-lg shadow-amber-200/60 transition hover:scale-105 print:hidden"
        style={{ animation: "hamster-bob 2.6s ease-in-out infinite" }}
      >
        <HamsterFace waving={waving} />
      </button>

      {/* 气泡提示（未展开时轮播） */}
      {!open ? (
        <div
          className="fixed bottom-[7.2rem] right-3 z-40 max-w-[220px] rounded-2xl rounded-br-sm border border-amber-200 bg-amber-50/95 px-3 py-2 text-xs leading-5 text-amber-800 shadow-sm print:hidden"
          style={{ animation: "hamster-bob 2.6s ease-in-out infinite" }}
        >
          {TIPS[tipIndex]}
        </div>
      ) : null}

      {/* 互动面板 */}
      {open ? (
        <div className="fixed bottom-[7.5rem] right-5 z-40 w-[min(92vw,400px)] overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl print:hidden">
          <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-amber-100 to-orange-50 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-900">仓鼠助手 · 栗子 🍁</p>
              <p className="text-xs text-slate-500">陪你看数据，帮你记玩法（可语音朗读）</p>
            </div>
            <button
              type="button"
              onClick={pet}
              className="rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50"
            >
              摸摸头
            </button>
          </div>

          <div ref={logRef} className="max-h-64 space-y-2 overflow-y-auto bg-[#fffdf6] px-4 py-3">
            {messages.map((message, index) => (
              <div
                key={`${index}-${message.text.slice(0, 8)}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <p
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-5 ${
                    message.role === "user"
                      ? "rounded-br-sm bg-sky-500 text-white"
                      : "rounded-bl-sm bg-amber-100 text-slate-700"
                  }`}
                >
                  {message.text}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-amber-100 bg-white px-3 py-2.5">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") ask();
              }}
              placeholder="问我：库存 / 诊断 / 审批 / 导入…"
              className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={ask}
              className="h-9 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-white transition hover:bg-amber-600"
            >
              发送
            </button>
            <button
              type="button"
              onClick={() => {
                const last = [...messages].reverse().find((message) => message.role === "hamster");
                if (last) speak(last.text);
              }}
              className="h-9 rounded-lg border border-slate-200 px-2 text-xs text-slate-600 transition hover:bg-slate-50"
              aria-label="朗读最近回复"
            >
              🔊
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-amber-100 bg-amber-50/60 px-3 py-2.5">
            {[
              { href: "/", label: "工作台" },
              { href: "/dashboard", label: "数据看板" },
              { href: "/agent", label: "Agent 中心" },
              { href: "/imports", label: "导入中心" },
              { href: "/automation", label: "自动化任务" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs text-amber-800 transition hover:bg-amber-100"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* 组件级动画样式：呼吸浮动 / 挥手 / 眨眼 */}
      <style>{`
        @keyframes hamster-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes hamster-wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-14deg); }
          60% { transform: rotate(10deg); }
        }
        @keyframes hamster-blink {
          0%, 92%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes hamster-leaf {
          0%, 100% { transform: rotate(-6deg); }
          50% { transform: rotate(8deg); }
        }
      `}</style>
    </>
  );
}

/** 仓鼠形象：圆滚滚橘色小仓鼠 + 枫叶（对照参考形象的卡通化重绘）。 */
function HamsterFace({ waving }: { waving: boolean }) {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full drop-shadow">
      {/* 身体 */}
      <ellipse cx="48" cy="56" rx="34" ry="30" fill="#FFD9A0" stroke="#7A4A21" strokeWidth="3" />
      {/* 耳朵 */}
      <circle cx="26" cy="30" r="10" fill="#FFD9A0" stroke="#7A4A21" strokeWidth="3" />
      <circle cx="70" cy="30" r="10" fill="#FFD9A0" stroke="#7A4A21" strokeWidth="3" />
      <circle cx="26" cy="30" r="4.5" fill="#FFC489" />
      <circle cx="70" cy="30" r="4.5" fill="#FFC489" />
      {/* 白色脸颊区 */}
      <ellipse cx="48" cy="62" rx="22" ry="16" fill="#FFF4E3" />
      {/* 眼睛（带眨眼动画） */}
      <g style={{ animation: "hamster-blink 4.2s ease-in-out infinite", transformOrigin: "48px 48px" }}>
        <circle cx="37" cy="48" r="3.4" fill="#4A2C12" />
        <circle cx="59" cy="48" r="3.4" fill="#4A2C12" />
      </g>
      {/* 腮红 */}
      <ellipse cx="30" cy="58" rx="6" ry="4" fill="#FFAB91" opacity="0.85" />
      <ellipse cx="66" cy="58" rx="6" ry="4" fill="#FFAB91" opacity="0.85" />
      {/* ω 嘴 */}
      <path d="M43 57 Q45.5 60 48 57 Q50.5 60 53 57" fill="none" stroke="#7A4A21" strokeWidth="2" strokeLinecap="round" />
      {/* 鼻子 */}
      <circle cx="48" cy="53.5" r="2" fill="#E58A5A" />
      {/* 小手（可动挥手） */}
      <g style={waving ? { animation: "hamster-wave 0.9s ease-in-out 1", transformOrigin: "76px 62px" } : undefined}>
        <ellipse cx="79" cy="64" rx="7" ry="5.5" fill="#FFD9A0" stroke="#7A4A21" strokeWidth="2.5" />
      </g>
      <ellipse cx="17" cy="64" rx="7" ry="5.5" fill="#FFD9A0" stroke="#7A4A21" strokeWidth="2.5" />
      {/* 枫叶（贴在头侧，轻轻摇摆） */}
      <g style={{ animation: "hamster-leaf 3s ease-in-out infinite", transformOrigin: "84px 30px" }}>
        <path
          d="M84 18 L87 25 L94 24 L89 30 L93 36 L86 34 L84 42 L82 34 L75 36 L79 30 L74 24 L81 25 Z"
          fill="#D95B43"
          stroke="#A94434"
          strokeWidth="1.5"
        />
        <path d="M84 22 L84 38" stroke="#A94434" strokeWidth="1.2" />
      </g>
    </svg>
  );
}
