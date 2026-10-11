"use client";

import { useEffect, useRef, useState } from "react";

import type { AgentRunEvent } from "@/types";

type StreamState = "connecting" | "live" | "done" | "closed";

type AgentRunEventStreamProps = {
  runId?: number;
};

const MAX_EVENTS = 30;

/**
 * 渲染 AgentRunEventStream 组件：通过 EventSource 订阅 BFF 透传的 SSE 事件流，
 * 实时累积运行事件（新事件在前，最多保留 30 条），终态或断开后自动收流。
 */
export function AgentRunEventStream({ runId }: AgentRunEventStreamProps) {
  const [events, setEvents] = useState<AgentRunEvent[]>([]);
  const [state, setState] = useState<StreamState>("connecting");
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setEvents([]);
    if (!runId) {
      setState("closed");
      return;
    }
    setState("connecting");
    const source = new EventSource(`/agent-runs/${runId}/stream`);
    sourceRef.current = source;

    source.addEventListener("agent_event", (rawEvent) => {
      setState("live");
      try {
        const event = JSON.parse((rawEvent as MessageEvent<string>).data) as AgentRunEvent;
        setEvents((current) => [event, ...current.filter((item) => item.id !== event.id)].slice(0, MAX_EVENTS));
      } catch {
        // 单帧解析失败不影响后续事件。
      }
    });
    source.addEventListener("done", () => {
      setState("done");
      source.close();
    });
    source.onerror = () => {
      // 后端在终态/超时后主动断流，浏览器会触发 error；此处收流避免无限重连。
      setState((current) => (current === "done" ? current : "closed"));
      source.close();
    };

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, [runId]);

  if (!runId) return null;

  const stateMeta = streamMeta(state);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${stateMeta.dotClass}`}
            aria-hidden="true"
          />
          <h3 className="font-semibold">实时事件流</h3>
        </div>
        <span className="text-xs text-slate-400">{stateMeta.label}</span>
      </div>
      <div className="mt-4 grid max-h-72 gap-3 overflow-y-auto pr-1">
        {events.length ? (
          events.map((event) => (
            <div key={event.id} className="border-l-2 border-sky-200 pl-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-800">{eventLabel(event.event_type)}</p>
                <span className="text-[11px] text-slate-400">{formatTime(event.created_at)}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {event.message ?? agentLabel(event.agent_name)}
              </p>
              {typeof event.metrics?.latency_ms === "number" ? (
                <p className="mt-1 text-[11px] text-slate-400">耗时 {event.metrics.latency_ms} ms</p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="py-6 text-center text-sm text-slate-400">
            {state === "connecting" ? "正在连接事件流…" : "暂无实时事件"}
          </p>
        )}
      </div>
    </div>
  );
}

/** 把流状态映射为指示点与中文标签，保持展示口径统一。 */
function streamMeta(state: StreamState) {
  const meta: Record<StreamState, { dotClass: string; label: string }> = {
    connecting: { dotClass: "animate-pulse bg-amber-400", label: "连接中" },
    live: { dotClass: "animate-pulse bg-emerald-500", label: "实时推送中" },
    done: { dotClass: "bg-slate-300", label: "已结束" },
    closed: { dotClass: "bg-slate-300", label: "连接已断开" },
  };
  return meta[state];
}

/** 把Agent状态映射为中文显示文本，保持页面口径一致。 */
function agentLabel(agentName: string | null) {
  const labels: Record<string, string> = {
    product_context_agent: "商品上下文",
    diagnosis_agent: "运营诊断",
    creative_strategy_agent: "创意策略",
    quality_review_agent: "质量审核",
  };
  return agentName ? (labels[agentName] ?? agentName) : "工作流";
}

/** 把事件状态映射为中文显示文本，保持页面口径一致。 */
function eventLabel(eventType: string) {
  const labels: Record<string, string> = {
    queued: "已进入队列",
    workflow_started: "工作流启动",
    workflow_resumed: "工作流恢复",
    agent_step_started: "专家开始处理",
    agent_step_completed: "专家处理完成",
    agent_step_failed: "专家处理失败",
    revision_requested: "质量返修",
    human_review_requested: "等待人工审核",
    resume_queued: "审核已提交",
    human_review_received: "收到人工决定",
  };
  return labels[eventType] ?? eventType;
}

/** 格式化time，统一空值、本地化和页面展示规则，避免各组件重复格式化。 */
function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
