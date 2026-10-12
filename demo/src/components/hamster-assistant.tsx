"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ChatMessage = {
  role: "hamster" | "user";
  text: string;
};

/** 业务问答表：命中即回（先匹配业务，再匹配闲聊）。 */
const QA_RULES: Array<{ keywords: string[]; reply: string }> = [
  { keywords: ["库存", "缺货", "补货"], reply: "吱！去「数据看板」能看低库存预警，店铺详情页里还有 AI 补货建议哦～" },
  { keywords: ["诊断", "分析"], reply: "吱吱～在商品详情页发起 Agent 任务：诊断→创意→质检→人工审批，全程实时事件流都能看！" },
  { keywords: ["审批", "风险"], reply: "高风险操作都会停在审批队列等你拍板，Agent 中心里有风险等级标识（R0~R3）。" },
  { keywords: ["看板", "报表", "数据"], reply: "「数据看板」汇总了商品、库存、创意和审批指标，还能一键导出打印版报告！" },
  { keywords: ["导入", "csv", "上传", "模板"], reply: "「导入中心」支持商品 / SKU / 经营数据批量导入，附赠字段映射和模板下载～" },
  { keywords: ["授权", "权限", "成员"], reply: "店铺详情页有「授权管理」，可以给每个成员单独开或关某个店铺的权限哦。" },
  { keywords: ["能做什么", "怎么用", "介绍"], reply: "我是栗子 🍁 这个工作台帮我管三件事：商品数据、AI 自动诊断、人工审批。左侧导航一眼就能看到全部功能！" },
];

/** 闲聊兜底：业务没命中再走这里，保证"闲聊也接得住"。 */
const CHAT_RULES: Array<{ keywords: string[]; reply: string }> = [
  { keywords: ["你好", "hello", "hi", "在吗", "嗨"], reply: "吱吱你好呀！我是仓鼠助手栗子，主营业务是搬商品数据，副业是被摸头 🍁" },
  { keywords: ["天气"], reply: "吱…我在屏幕里看不到窗外，不过不管刮风下雨，库存预警我都会帮你盯着！" },
  { keywords: ["笑话", "讲一个", "搞笑"], reply: "吱吱：为什么仓鼠不做电商？——因为 cheeks（腮帮 / 支票）总是装不下那么多货！🍁" },
  { keywords: ["无聊", "没意思"], reply: "无聊的话…要不要去「数据看板」看看有没有库存亮红灯？帮它补货可有意思啦～" },
  { keywords: ["可爱", "夸", "棒", "厉害"], reply: "呜哇，被夸得胡须都翘起来了！你也很棒呀，运营数据管得井井有条！" },
  { keywords: ["累", "辛苦", "加班"], reply: "摸摸你（虚拟）！ repetitive 的活儿交给我和 Agent 们，你去歇会儿～" },
  { keywords: ["再见", "拜拜", "晚安"], reply: "吱吱，拜拜～我会在这里盯着数据，你随时回来找我！" },
  { keywords: ["冷", "冻"], reply: "我把腮帮里的瓜子分你一把，捂手专用，超暖！" },
];

/** 业务与闲聊都没命中的最终兜底。 */
const CASUAL_FALLBACK = "吱吱…这题超纲啦！不过没关系，闲聊我也接得住——可以让我讲个笑话、夸夸你，或者问我：库存、诊断、审批、导入？";

/** 建议提问 chips（对照参考视频：聊天窗内的业务引导按钮）。 */
const SUGGESTIONS = ["这个工作台能做什么？", "库存不足怎么看？", "怎么发起 AI 诊断？", "给我讲个笑话"];

const PET_REPLIES = [
  "呼噜呼噜～最开心被摸头了吱！",
  "呜哇，毛都顺了，谢谢老板！",
  "再摸就要掉枫叶啦～🍁",
  "吱吱～头巾都摸歪了啦！",
];

const JUMP_REPLIES = [
  "看我的弹跳！瓜子腿不是白练的！",
  "蹦——！够高吧？",
  "运动一下，顺便热热腮帮～",
  "跳跳更健康，落地无声！",
];

const WELCOME = "吱吱！我是仓鼠助手栗子 🍁 有问题随时问我——业务问题、闲聊、讲笑话我都能接住～";

/** 位置持久化 key。 */
const POS_STORAGE_KEY = "hamster-assistant-pos";

/** 视口内约束位置。 */
function clampPos(x: number, y: number) {
  if (typeof window === "undefined") return { x, y };
  const maxX = window.innerWidth - 100;
  const maxY = window.innerHeight - 100;
  return { x: Math.min(Math.max(8, x), Math.max(8, maxX)), y: Math.min(Math.max(8, y), Math.max(8, maxY)) };
}

function matchReply(input: string) {
  const text = input.trim().toLowerCase();
  const business = QA_RULES.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)));
  if (business) return business.reply;
  const casual = CHAT_RULES.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)));
  if (casual) return casual.reply;
  return CASUAL_FALLBACK;
}

/**
 * 渲染 HamsterAssistant：右下角 2D 仓鼠助手（1:1 复刻参考视频的"小遥"猫客服交互）。
 * 可拖动（位置存 localStorage）；单击弹三键竖排菜单（摸摸头 / 跳跳 / 喵…吱吱）；
 * 摸摸头出气泡 + 挥手；跳跳出跳跃动画；喵…吱吱打开聊天窗（欢迎语 + 建议 chips + 输入框 + 闲聊兜底）。
 * 挂在 AppShell 中跨页面常驻，不依赖任何外部 SDK。
 */
export function HamsterAssistant() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hydrated, setHydrated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  const [waving, setWaving] = useState(false);
  const [jumping, setJumping] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "hamster", text: WELCOME }]);
  const logRef = useRef<HTMLDivElement | null>(null);
  const bubbleTimer = useRef<number | null>(null);
  /** pos 的镜像 ref：window 级指针监听里读取最新位置，不依赖重渲染。 */
  const posRef = useRef(pos);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, posX: 0, posY: 0, moved: false });

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  /** 恢复 localStorage 位置并挂初始位置。 */
  useEffect(() => {
    let restored: { x: number; y: number } | null = null;
    try {
      const raw = window.localStorage.getItem(POS_STORAGE_KEY);
      if (raw) restored = JSON.parse(raw) as { x: number; y: number };
    } catch {
      restored = null;
    }
    setPos(
      restored
        ? clampPos(restored.x, restored.y)
        : clampPos(window.innerWidth - 130, window.innerHeight - 200),
    );
    setHydrated(true);
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chatOpen]);

  /** 显示气泡，3.2s 后自动消失。 */
  const showBubble = useCallback((text: string) => {
    setBubble(text);
    if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
    bubbleTimer.current = window.setTimeout(() => setBubble(null), 3200);
  }, []);

  /** 摸摸头：挥手动画 + 随机气泡。 */
  const pet = useCallback(() => {
    setWaving(true);
    window.setTimeout(() => setWaving(false), 1200);
    showBubble(PET_REPLIES[Math.floor(Math.random() * PET_REPLIES.length)]);
  }, [showBubble]);

  /** 跳跳：起跳压缩→腾空→落地动画 + 随机气泡。 */
  const jump = useCallback(() => {
    setJumping(true);
    window.setTimeout(() => setJumping(false), 1000);
    showBubble(JUMP_REPLIES[Math.floor(Math.random() * JUMP_REPLIES.length)]);
  }, [showBubble]);

  /** 喵…吱吱：气泡 + 打开聊天窗。 */
  const openChat = useCallback(() => {
    setMenuOpen(false);
    setChatOpen(true);
    showBubble("吱吱！想聊点什么？");
  }, [showBubble]);

  /**
   * 拖动（window 级监听版）：pointerdown 在仓鼠上记起点并激活拖动；
   * move/up 监听挂在 window 上——鼠标移出元素、在页面任意位置松手都能正确结束，
   * 彻底修复"松手后停不下来、要晃回仓鼠身上才停"的卡死问题。
   */
  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      posX: posRef.current.x,
      posY: posRef.current.y,
      moved: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 捕获失败不影响：window 级监听兜底。
    }
  }, []);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag.active) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) < 6) return; // 6px 内视为单击
      drag.moved = true;
      const next = clampPos(drag.posX + dx, drag.posY + dy);
      posRef.current = next;
      setPos(next);
    };
    const onUp = () => {
      const drag = dragRef.current;
      if (!drag.active) return;
      drag.active = false; // 任何情况下先结束拖动，保证必定能停
      if (drag.moved) {
        try {
          window.localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(posRef.current));
        } catch {
          // 存储不可用时不影响功能。
        }
      } else {
        setMenuOpen((current) => !current); // 未移动 = 单击：切换三键菜单
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  /** 发送消息：业务优先 → 闲聊 → 兜底。 */
  const ask = useCallback((raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text) return;
    const reply = matchReply(text);
    setMessages((current) => [...current, { role: "user", text }, { role: "hamster", text: reply }]);
    setInput("");
  }, [input]);

  return (
    <>
      {/* 气泡（摸头 / 跳跳 / 开聊天时的反馈） */}
      {bubble && !chatOpen ? (
        <div
          className="fixed z-50 max-w-[220px] rounded-2xl rounded-br-sm border border-amber-200 bg-amber-50/95 px-3 py-2 text-xs leading-5 text-amber-800 shadow-sm print:hidden"
          style={{ left: Math.max(8, pos.x - 150), top: Math.max(8, pos.y - 8), animation: "hamster-bob 2.6s ease-in-out infinite" }}
        >
          {bubble}
        </div>
      ) : null}

      {/* 三键竖排菜单（单击仓鼠弹出） */}
      {menuOpen && !chatOpen ? (
        <div
          className="fixed z-50 flex w-[132px] flex-col overflow-hidden rounded-xl border border-amber-200 bg-white shadow-xl print:hidden"
          style={{ left: pos.x + 84, top: pos.y - 8 }}
        >
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              pet();
            }}
            className="border-b border-amber-100 px-3 py-2.5 text-left text-xs font-medium text-slate-700 transition hover:bg-amber-50"
          >
            🤚 摸摸头
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              jump();
            }}
            className="border-b border-amber-100 px-3 py-2.5 text-left text-xs font-medium text-slate-700 transition hover:bg-amber-50"
          >
            🐾 跳跳
          </button>
          <button
            type="button"
            onClick={openChat}
            className="px-3 py-2.5 text-left text-xs font-medium text-slate-700 transition hover:bg-amber-50"
          >
            🗨 喵…吱吱
          </button>
        </div>
      ) : null}

      {/* 聊天窗（对照参考视频：琥珀头部 + 米色消息区 + 建议 chips + 输入框） */}
      {chatOpen ? (
        <div
          className="fixed z-50 flex w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-2xl print:hidden"
          style={{ left: Math.min(pos.x, Math.max(8, (typeof window !== "undefined" ? window.innerWidth : 0) - 400)), top: Math.max(8, pos.y - 340) }}
        >
          <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-amber-200 to-orange-100 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-900">🐹 栗子 · AI 助手</p>
              <p className="text-xs text-slate-500">仓鼠客服，在线服务</p>
            </div>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/60 hover:text-slate-800"
              aria-label="关闭聊天窗"
            >
              ✕
            </button>
          </div>

          <div ref={logRef} className="max-h-72 space-y-2 overflow-y-auto bg-[#faf6ec] px-4 py-3">
            {messages.map((message, index) => (
              <div
                key={`${index}-${message.text.slice(0, 8)}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <p
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-5 ${
                    message.role === "user"
                      ? "rounded-br-sm bg-sky-500 text-white"
                      : "rounded-bl-sm bg-white text-slate-700 shadow-sm"
                  }`}
                >
                  {message.text}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-amber-100 bg-amber-50/60 px-3 py-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => ask(suggestion)}
                className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs text-amber-800 transition hover:bg-amber-100"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-amber-100 bg-white px-3 py-2.5">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                // 中文输入法组词确认的 Enter 不触发发送（isComposing 守卫）
                if (event.key === "Enter" && !event.nativeEvent.isComposing) ask();
              }}
              placeholder="问栗子点什么吱…"
              className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={() => ask()}
              className="h-9 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-white transition hover:bg-amber-600"
            >
              发送
            </button>
          </div>
        </div>
      ) : null}

      {/* 仓鼠本体：可拖动 + 单击弹菜单 + 跳跃动画 */}
      <div
        onPointerDown={onPointerDown}
        role="button"
        tabIndex={0}
        aria-label="仓鼠助手栗子（可拖动，单击打开菜单）"
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") setMenuOpen((current) => !current);
        }}
        className="fixed z-40 h-[92px] w-[92px] cursor-grab touch-none select-none rounded-full active:cursor-grabbing print:hidden"
        style={{
          left: pos.x,
          top: pos.y,
          display: hydrated ? undefined : "none",
          animation: jumping ? "hamster-jump-frames 1s ease-in-out 1" : "hamster-bob 2.6s ease-in-out infinite",
        }}
      >
        <HamsterFace waving={waving} />
      </div>

      {/* 组件级动画样式 */}
      <style>{`
        @keyframes hamster-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes hamster-jump-frames {
          0% { transform: translateY(0) scale(1, 1); }
          20% { transform: translateY(6px) scale(1.15, 0.85); }
          45% { transform: translateY(-46px) scale(0.92, 1.1); }
          70% { transform: translateY(0) scale(1.05, 0.95); }
          85% { transform: translateY(-8px) scale(1, 1); }
          100% { transform: translateY(0) scale(1, 1); }
        }
        @keyframes hamster-wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-16deg); }
          60% { transform: rotate(12deg); }
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

/** 仓鼠形象：橘色小仓鼠 + 枫叶（对照参考形象的卡通化重绘）。 */
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
      {/* 眼睛（眨眼动画） */}
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
      {/* 小手（摸头时挥手） */}
      <g style={waving ? { animation: "hamster-wave 0.9s ease-in-out 2", transformOrigin: "76px 62px" } : undefined}>
        <ellipse cx="79" cy="64" rx="7" ry="5.5" fill="#FFD9A0" stroke="#7A4A21" strokeWidth="2.5" />
      </g>
      <ellipse cx="17" cy="64" rx="7" ry="5.5" fill="#FFD9A0" stroke="#7A4A21" strokeWidth="2.5" />
      {/* 枫叶（头侧，轻轻摇摆） */}
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
