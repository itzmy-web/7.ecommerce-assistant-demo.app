"use client";

import { Printer } from "lucide-react";

/** 渲染打印按钮：触发浏览器打印（另存为 PDF 即为报告导出）。 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:border-violet-300 hover:text-violet-700 print:hidden"
    >
      <Printer className="h-4 w-4" />
      打印 / 导出 PDF
    </button>
  );
}
