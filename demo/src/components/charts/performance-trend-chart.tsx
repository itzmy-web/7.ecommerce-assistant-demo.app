"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

import type { DashboardPerformancePoint } from "@/types";

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

type PerformanceTrendChartProps = {
  points: DashboardPerformancePoint[];
};

/** 渲染经营趋势折线图：revenue 走左轴，clicks/conversions 走右轴。 */
export function PerformanceTrendChart({ points }: PerformanceTrendChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const chart = echarts.init(containerRef.current);
    chartRef.current = chart;

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) {
      return;
    }
    const labels = points.map((point) => point.period_start);
    chart.setOption({
      tooltip: { trigger: "axis" },
      legend: { data: ["收入(元)", "点击", "转化"] },
      grid: { left: 48, right: 48, top: 40, bottom: 32 },
      xAxis: { type: "category", data: labels },
      yAxis: [
        { type: "value", name: "收入(元)", axisLabel: { formatter: (v: number) => `${v}` } },
        { type: "value", name: "次数" },
      ],
      series: [
        {
          name: "收入(元)",
          type: "line",
          smooth: true,
          data: points.map((point) => Number(point.revenue)),
        },
        {
          name: "点击",
          type: "line",
          smooth: true,
          yAxisIndex: 1,
          data: points.map((point) => point.clicks),
        },
        {
          name: "转化",
          type: "line",
          smooth: true,
          yAxisIndex: 1,
          data: points.map((point) => point.conversions),
        },
      ],
    });
  }, [points]);

  return <div ref={containerRef} className="h-80 w-full" />;
}
