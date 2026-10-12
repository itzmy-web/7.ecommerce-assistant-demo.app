import type { Metadata } from "next";
import "./globals.css";

import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "电商运营助手",
  description: "AI 单品运营工作台",
};

/** 渲染 RootLayout 组件，集中展示根布局所需的数据、状态和操作入口。 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
        {/* 演示版页脚：风险提示 + 隐私说明 + 合规提示 */}
        <footer className="border-t border-slate-200 bg-white px-5 py-4 text-center text-xs leading-5 text-slate-400">
          <p>演示版 · 全部数据为内置模拟数据，不会永久存储您输入的内容 · AI 生成内容仅供参考，商品参数与文案请人工复核，禁止直接用于商品上架</p>
          <p className="mt-1">正式商用请使用完整版并自行完成 ICP 备案等合规要求</p>
        </footer>
        {/* 演示版水印：数据为内置模拟数据，与本地真实服务区分 */}
        <div className="pointer-events-none fixed bottom-3 right-3 z-50 rounded-full border border-amber-300 bg-amber-50/90 px-3 py-1 text-xs font-medium text-amber-700 shadow-sm">
          演示版 · 数据为模拟数据
        </div>
      </body>
    </html>
  );
}
