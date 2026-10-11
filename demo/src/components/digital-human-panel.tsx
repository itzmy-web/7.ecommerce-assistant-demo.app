"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Plug, PlugZap, Square } from "lucide-react";

import type { DigitalHumanCredentials } from "@/types";

/** 魔珐星云 LiteSDK 实例上会用到的最小方法集。 */
type XmovAvatarInstance = {
  init(options: {
    initModel: string;
    onDownloadProgress: (progress: number) => void;
  }): void;
  speak(ssml: string, isStart: boolean, isEnd: boolean): void;
  interactiveidle(): void;
  offlineMode(): void;
  onlineMode(): void;
  destroy(): void;
};

type XmovAvatarConstructor = new (options: Record<string, unknown>) => XmovAvatarInstance;

declare global {
  interface Window {
    XmovAvatar?: XmovAvatarConstructor;
  }
}

const SDK_SCRIPT_URL = "https://media.xingyun3d.com/xingyun3d/general/litesdk/xmovAvatar@latest.js";
const CONTAINER_SELECTOR = "#digital-human-sdk";

type PanelStatus = "disconnected" | "connecting" | "ready";

type DigitalHumanPanelProps = {
  credentials: DigitalHumanCredentials;
};

/** 动态加载魔珐星云 SDK 脚本；重复调用时复用已注入的 script。 */
function loadSdkScript(): Promise<XmovAvatarConstructor> {
  return new Promise((resolve, reject) => {
    if (window.XmovAvatar) {
      resolve(window.XmovAvatar);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SCRIPT_URL}"]`);
    const script = existing ?? document.createElement("script");
    const handleLoad = () => {
      if (window.XmovAvatar) {
        resolve(window.XmovAvatar);
      } else {
        reject(new Error("SDK 加载完成但未找到 XmovAvatar 全局对象"));
      }
    };
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("SDK 脚本加载失败，请检查网络")),
      { once: true },
    );
    if (!existing) {
      script.src = SDK_SCRIPT_URL;
      document.body.appendChild(script);
    } else if (window.XmovAvatar) {
      // 兜底：脚本已在页面里但 load 事件早已错过。
      handleLoad();
    }
  });
}

/** 渲染数字人面板：连接/销毁、资源下载进度、文本驱动说话与状态控制。 */
export function DigitalHumanPanel({ credentials }: DigitalHumanPanelProps) {
  const [status, setStatus] = useState<PanelStatus>("disconnected");
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState<string>("点击「连接数字人」开始，资源下载约需十几秒。");
  const [isError, setIsError] = useState(false);
  const [speakText, setSpeakText] = useState("欢迎使用电商运营助手，我是你的 AI 数字人运营搭档。");
  const sdkRef = useRef<XmovAvatarInstance | null>(null);
  const readyRef = useRef(false);

  /** 统一的提示输出：同时落到页面提示区与浏览器控制台。 */
  const log = useCallback((message: string, level: "info" | "error" = "info") => {
    setNotice(message);
    setIsError(level === "error");
  }, []);

  /** 销毁实例并复位 UI；页面卸载时也会复用。 */
  const destroySdk = useCallback(() => {
    try {
      sdkRef.current?.destroy();
    } catch {
      // 实例可能尚未建立，忽略销毁异常。
    }
    sdkRef.current = null;
    readyRef.current = false;
    setProgress(0);
    setStatus("disconnected");
    log("已断开，可重新连接。");
  }, [log]);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setProgress(0);
    log("正在加载 SDK…");
    try {
      const XmovAvatar = await loadSdkScript();
      const sdk = new XmovAvatar({
        containerId: CONTAINER_SELECTOR,
        appId: credentials.app_id,
        appSecret: credentials.app_secret,
        gatewayServer: credentials.gateway_server,
        hardwareAcceleration: "prefer-hardware",
        enableLogger: true,
        onMessage(message: { code?: number; message?: string }) {
          // 50001/50002 是离线/在线模式切换，不是错误。
          if (message && message.code && ![50001, 50002].includes(message.code)) {
            log(`SDK 错误 code=${message.code} ${message.message ?? ""}`, "error");
          }
        },
        onVoiceStateChange(voiceStatus: string) {
          if (voiceStatus === "start") log("数字人正在说话…");
          if (voiceStatus === "end") log("就绪。");
        },
        onStateChange(state: string) {
          if (state === "speak") log("数字人正在说话…");
        },
      });
      sdkRef.current = sdk;
      log("正在建立会话并下载 3D 资源…");
      sdk.init({
        initModel: "normal",
        onDownloadProgress(value: number) {
          setProgress(value);
          if (value >= 100 && !readyRef.current) {
            readyRef.current = true;
            setStatus("ready");
            log("数字人就绪，输入内容后点「说话」驱动 TA 开口。");
          }
        },
      });
    } catch (error) {
      destroySdk();
      log(error instanceof Error ? error.message : "数字人初始化失败", "error");
    }
  }, [credentials, destroySdk, log]);

  const speak = useCallback(() => {
    const text = speakText.trim();
    if (!text) {
      log("请先输入要让数字人说的话。", "error");
      return;
    }
    if (!readyRef.current || !sdkRef.current) {
      log("数字人尚未就绪，等进度条走完再试。", "error");
      return;
    }
    // 非流式一次性说话：is_start=true, is_end=true。
    sdkRef.current.speak(text, true, true);
    log("已下发说话指令，数字人正在朗读。");
  }, [log, speakText]);

  const backToIdle = useCallback(() => {
    sdkRef.current?.interactiveidle();
    log("已切回互动待机。");
  }, [log]);

  // 页面卸载前断开连接，避免触发并发限制（错误码 10005）。
  useEffect(() => {
    const handleUnload = () => {
      try {
        sdkRef.current?.destroy();
      } catch {
        // 忽略。
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  const connectDisabled = status !== "disconnected";

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* 左侧：数字人渲染区（9:16，官方最小 270x480） */}
      <div className="mx-auto w-[280px]">
        <div className="relative h-[500px] w-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-lg">
          <div id="digital-human-sdk" className="h-full w-full" />
          {status === "connecting" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
              <p className="text-xs text-white/80">正在连接数字人… {progress}%</p>
              <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}
          {status === "disconnected" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/50">
              <PlugZap className="h-8 w-8" aria-hidden="true" />
              <p className="text-xs">数字人未连接</p>
            </div>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {status === "ready" ? (
            <button
              type="button"
              onClick={destroySdk}
              className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 text-sm font-medium text-white transition hover:bg-rose-500"
            >
              <Square className="h-3.5 w-3.5" aria-hidden="true" />
              销毁实例
            </button>
          ) : (
            <button
              type="button"
              onClick={connect}
              disabled={connectDisabled}
              className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Plug className="h-3.5 w-3.5" aria-hidden="true" />
              {status === "connecting" ? "连接中…" : "连接数字人"}
            </button>
          )}
          <button
            type="button"
            onClick={backToIdle}
            disabled={status !== "ready"}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 text-xs text-slate-600 transition hover:border-sky-300 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            回到待机
          </button>
          <button
            type="button"
            onClick={speak}
            disabled={status !== "ready"}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-sky-600 text-xs font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Mic className="h-3.5 w-3.5" aria-hidden="true" />
            说话
          </button>
        </div>
      </div>

      {/* 右侧：状态提示 + 说话输入 */}
      <div className="flex flex-col gap-4">
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            isError
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          {notice}
        </div>
        <div>
          <label
            htmlFor="digital-human-speak"
            className="text-xs font-medium text-slate-500"
          >
            输入数字人要说的话
          </label>
          <textarea
            id="digital-human-speak"
            value={speakText}
            onChange={(event) => setSpeakText(event.target.value)}
            rows={6}
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-50"
            placeholder="例如：欢迎来到电商运营助手，今天店铺数据表现不错。"
          />
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-xs leading-relaxed text-slate-500">
          <p className="font-medium text-slate-600">使用说明</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>SDK 走魔珐星云端侧渲染，首次连接需下载 3D 资源，请保持网络畅通。</li>
            <li>凭证由后端 <code>/api/v1/digital-human/credentials</code> 下发，前端源码零硬编码。</li>
            <li>离开页面前会自动销毁实例，避免占用并发额度（错误码 10005）。</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
