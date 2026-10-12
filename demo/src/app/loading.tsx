export default function Loading() {
  /** 全局路由级骨架屏：导航切换/首屏加载时给即时反馈，避免白屏被误认为卡死。 */
  return (
    <div className="min-h-screen bg-[#f7f8fb] px-5 py-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="h-9 w-40 animate-pulse rounded-md bg-slate-200" />
        <div className="h-28 animate-pulse rounded-md bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="h-24 animate-pulse rounded-md bg-slate-200" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((index) => (
            <div key={index} className="h-64 animate-pulse rounded-md bg-slate-200" />
          ))}
        </div>
        <p className="text-center text-sm text-slate-400">正在初始化助手，马上就好…</p>
      </div>
    </div>
  );
}
