import { NextResponse } from "next/server";

/**
 * 演示版内置 API：真实前端原封不动，这里用静态演示数据充当后端。
 * 覆盖全部页面的 GET 渲染数据 + 主要操作的 POST 成功响应，
 * 让登录 / 首页 / 商品 / 店铺 / 看板 / Agent 平台 / 设置 / 导入在云端完整可走通。
 * 所有数据均为虚构演示数据；数字人凭证接口返回 503，与真实后端"未配置"行为一致。
 */

type Params = { params: Promise<{ path: string[] }> };

const now = new Date("2026-10-11T10:00:00+08:00");
const iso = (dayOffset: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - dayOffset);
  return d.toISOString();
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

// ───────────────────────── 基础数据 ─────────────────────────

const DEMO_USER = {
  id: 1,
  email: "demo@demo.com",
  display_name: "演示运营",
  role: "owner",
  status: "active",
  permissions: {
    can_read: true,
    can_edit: true,
    can_manage_users: true,
    can_confirm_ad_actions: true,
  },
  last_login_at: iso(0),
  created_at: iso(120),
  updated_at: iso(0),
};

const WORKSPACE = {
  workspace: {
    id: 1,
    slug: "demo",
    name: "演示工作台",
    status: "active",
    settings: {},
    created_at: iso(120),
    updated_at: iso(10),
  },
  membership: {
    id: 1,
    workspace_id: 1,
    user_id: 1,
    role: "owner",
    status: "active",
    created_at: iso(120),
    updated_at: iso(10),
  },
};

const PRODUCTS = [
  {
    id: 1, store_id: 1, name: "云感轻氧羽绒被", platform: "tmall", category: "家纺",
    price: "499.00", cost: "268.00", target_audience: "25-40 城市白领家庭",
    selling_points: ["95% 白鹅绒", "抗菌面料", "可机洗"],
    product_url: "https://example.com/p/1", external_product_id: "TM-10001",
    platform_status: "在售", images: [],
    created_at: iso(90), updated_at: iso(3),
  },
  {
    id: 2, store_id: 1, name: "零感美容仪 Pro", platform: "douyin", category: "美容仪器",
    price: "1299.00", cost: "640.00", target_audience: "22-35 精致女性",
    selling_points: ["射频+微电流", "无线续航", "礼盒装"],
    product_url: "https://example.com/p/2", external_product_id: "DY-20002",
    platform_status: "在售", images: [],
    created_at: iso(60), updated_at: iso(2),
  },
  {
    id: 3, store_id: 2, name: "山野冷萃咖啡液 30 条", platform: "jd", category: "食品饮料",
    price: "89.00", cost: "41.00", target_audience: "咖啡刚需上班族",
    selling_points: ["0 蔗糖", "3 秒速溶", "冷热双溶"],
    product_url: "https://example.com/p/3", external_product_id: "JD-30003",
    platform_status: "在售", images: [],
    created_at: iso(45), updated_at: iso(1),
  },
];

const SKUS = [
  {
    id: 11, product_id: 1, sku_code: "RYB-200-冬", name: "冬款加厚 200×230",
    attributes: { 颜色: "云白", 尺寸: "200×230" }, price: "499.00", cost: "268.00",
    status: "active",
    inventory_item: { id: 1, sku_id: 11, quantity: 9, locked_quantity: 3, warning_threshold: 30, location: "A 区-01", created_at: iso(90), updated_at: iso(1) },
    inventory_movements: [],
    created_at: iso(90), updated_at: iso(1),
  },
  {
    id: 12, product_id: 1, sku_code: "RYB-200-秋", name: "秋款轻薄 200×230",
    attributes: { 颜色: "雾灰", 尺寸: "200×230" }, price: "399.00", cost: "205.00",
    status: "active",
    inventory_item: { id: 2, sku_id: 12, quantity: 86, locked_quantity: 10, warning_threshold: 30, location: "A 区-02", created_at: iso(90), updated_at: iso(1) },
    inventory_movements: [],
    created_at: iso(90), updated_at: iso(1),
  },
  {
    id: 21, product_id: 2, sku_code: "MRJ-PRO-标准", name: "标准款",
    attributes: { 版本: "Pro" }, price: "1299.00", cost: "640.00",
    status: "active",
    inventory_item: { id: 3, sku_id: 21, quantity: 18, locked_quantity: 6, warning_threshold: 50, location: "B 区-01", created_at: iso(60), updated_at: iso(1) },
    inventory_movements: [],
    created_at: iso(60), updated_at: iso(1),
  },
  {
    id: 31, product_id: 3, sku_code: "KF-30-经典", name: "经典烘焙",
    attributes: { 规格: "30 条" }, price: "89.00", cost: "41.00",
    status: "active",
    inventory_item: { id: 4, sku_id: 31, quantity: 36, locked_quantity: 12, warning_threshold: 60, location: "C 区-01", created_at: iso(45), updated_at: iso(1) },
    inventory_movements: [],
    created_at: iso(45), updated_at: iso(1),
  },
];

const STORES = [
  {
    id: 1, name: "云朵家居旗舰店", platform: "tmall", status: "active",
    external_store_id: "TM-Shop-1", owner_name: "土豆", note: "演示店铺",
    platform_accounts: [
      { id: 1, store_id: 1, platform: "tmall", account_name: "云朵家居主账号", external_account_id: "TM-Acc-1", status: "active", auth_metadata: {}, note: null, created_at: iso(90), updated_at: iso(9) },
    ],
    created_at: iso(90), updated_at: iso(9),
  },
  {
    id: 2, name: "山野食品自营店", platform: "jd", status: "active",
    external_store_id: "JD-Shop-2", owner_name: "土豆", note: "演示店铺",
    platform_accounts: [],
    created_at: iso(80), updated_at: iso(8),
  },
];

const DIAGNOSIS = {
  id: 1, product_id: 1, agent_run_id: null, source: "agent",
  positioning: "中高端家纺单品：以「95% 白鹅绒 + 可机洗」打差异，主打换季焕新场景。",
  price_band: "400-580 元（当前 499 处于价格带中枢，锚定竞品 529 合理）",
  audience_insights: ["25-40 城市白领家庭，复购以换季为主", "对材质认证与洗护便利性敏感", "夜间浏览占比 62%，适合晚间投放"],
  pain_points: ["厚重被芯难清洗", "劣质绒跑绒有异味", "尺寸与床品套件搭配困惑"],
  selling_point_analysis: ["「可机洗」是最强差异点，建议主图首屏突出", "「抗菌面料」需补充检测报告增强可信度", "价格对比竞品有 30 元优势，可在详情页明示"],
  risks: ["旺季竞品降价空间大", "主图点击率低于类目均值"],
  recommendations: ["首屏主图增加机洗场景实拍", "上线「以旧换新」承接换季需求", "晚间 20-23 点加大投放预算"],
  raw_output: {},
  created_at: iso(5), updated_at: iso(5),
};

const CREATIVE_PLANS = [
  {
    id: 1, product_id: 1, type: "main_image", title: "主图方案 A · 机洗场景",
    content: { headline: "可机洗的白鹅绒被", sub_headline: "95% 绒含量 · 30°C 机洗不结块", visual_focus: "洗衣机旁自然光实拍" },
    rationale: "直击「难清洗」痛点，与竞品形成第一眼差异。", status: "selected",
    created_at: iso(6), updated_at: iso(6),
  },
  {
    id: 2, product_id: 1, type: "video_script", title: "短视频脚本 · 15s 换季焕新",
    content: { hook: "还在为洗被子发愁？", beats: ["痛点 3s", "机洗演示 6s", "蓬松对比 4s", "促销落版 2s"], cta: "换季焕新价 499" },
    rationale: "前 3 秒钩子直给痛点，完播率预期高于类目均值。", status: "draft",
    created_at: iso(4), updated_at: iso(4),
  },
];

const PERFORMANCE_RECORDS = [1, 2, 3, 4, 5, 6].map((i) => ({
  id: i, product_id: 1, creative_plan_id: null, ad_experiment_id: null, promotion_link_id: null, generated_asset_id: null,
  period_start: iso(i * 5), period_end: iso(i * 5 - 5),
  impressions: 12000 + i * 800, clicks: 420 + i * 30, ctr: (0.035 + i * 0.001).toFixed(4),
  conversions: 13 + i * 2, conversion_rate: (0.031).toFixed(4),
  spend: (210 + i * 15).toFixed(2), revenue: (620 + i * 55).toFixed(2), roi: (2.6 + i * 0.12).toFixed(2),
  notes: null, created_at: iso(i * 5), updated_at: iso(i * 5),
}));

const PROMOTION_LINKS = [
  { id: 1, product_id: 1, label: "抖音短视频投流", url: "https://s.example.com/abc1", link_type: "short_url", scenario: "douyin_feed", status: "active", tracking_code: "dy-abc1", short_code: "abc1", tracking_url: "https://s.example.com/abc1", click_count: 1284, note: null, created_at: iso(20), updated_at: iso(2) },
  { id: 2, product_id: 1, label: "小红书种草笔记", url: "https://s.example.com/def2", link_type: "short_url", scenario: "xhs_note", status: "active", tracking_code: "xhs-def2", short_code: "def2", tracking_url: "https://s.example.com/def2", click_count: 862, note: null, created_at: iso(15), updated_at: iso(3) },
];

const AGENT_RUNS = [
  {
    id: 101, thread_id: "run-101", workspace_id: 1, task_id: 1, product_id: 1, requested_by_user_id: 1,
    workflow_key: "product_diagnosis_optimization", workflow_version: "v1", attempt: 1, queue_name: "agent",
    status: "completed", current_agent: null, revision_count: 1, max_revisions: 2,
    budget: {}, usage: {}, version_manifest: {}, context_snapshot: {},
    draft_output: {}, quality_report: { passed: true, score: 88, issues: [], checked_rules: ["non_empty", "llm_judge"] },
    final_output: { summary: "输出 3 条创意方案并入选 1 条" },
    error: null, lease_owner: null, lease_expires_at: null, timeout_at: null, cancel_requested_at: null,
    started_at: iso(5), finished_at: iso(5), created_at: iso(5), updated_at: iso(5),
    events: [], reviews: [],
  },
  {
    id: 102, thread_id: "run-102", workspace_id: 1, task_id: 2, product_id: 2, requested_by_user_id: 1,
    workflow_key: "creative_content_production", workflow_version: "v1", attempt: 1, queue_name: "agent",
    status: "awaiting_review", current_agent: "approval_gate", revision_count: 0, max_revisions: 2,
    budget: {}, usage: {}, version_manifest: {}, context_snapshot: {},
    draft_output: {}, quality_report: { passed: true, score: 82, issues: [], checked_rules: ["non_empty", "llm_judge"] },
    final_output: {},
    error: null, lease_owner: null, lease_expires_at: null, timeout_at: null, cancel_requested_at: null,
    started_at: iso(1), finished_at: null, created_at: iso(1), updated_at: iso(1),
    events: [], reviews: [],
  },
];

const AD_EXPERIMENTS = [
  { id: 1, product_id: 1, generated_asset_id: null, promotion_link_id: 1, name: "1024 主图 A/B 实验", objective: "验证主图方案 A 的点击率优势", audience: "25-40 白领家庭", daily_budget: "150.00", status: "measured", success_metric: "ctr", hypothesis: "机洗场景主图 CTR 高于类目均值 15%", note: null, created_at: iso(12), updated_at: iso(5) },
  { id: 2, product_id: 1, generated_asset_id: null, promotion_link_id: 2, name: "1025 人群定向实验", objective: "对比两条人群包的 ROI", audience: "家居兴趣人群", daily_budget: "120.00", status: "running", success_metric: "roi", hypothesis: "家居兴趣人群 ROI 更高", note: null, created_at: iso(6), updated_at: iso(2) },
];

const AD_EXPERIMENT_DASHBOARD = {
  product_id: 1, total_experiments: 2, active_experiments: 1, measured_experiments: 1,
  total_spend: "1260.00", total_revenue: "3980.00", overall_roi: "3.16",
  best_experiment: {
    ad_experiment_id: 1, name: "1024 主图 A/B 实验", status: "measured", generated_asset_id: null, promotion_link_id: 1,
    daily_budget: "150.00", record_count: 6, period_start: iso(12), period_end: iso(5),
    impressions: 42000, clicks: 1680, conversions: 52, spend: "630.00", revenue: "2140.00",
    ctr: "0.0400", conversion_rate: "0.0310", roi: "3.40", cpc: "0.38", cpa: "12.12",
    decision: "scale", decision_reason: "ROI 3.40 高于阈值 2.5，建议放量",
  },
  rows: [
    {
      ad_experiment_id: 1, name: "1024 主图 A/B 实验", status: "measured", generated_asset_id: null, promotion_link_id: 1,
      daily_budget: "150.00", record_count: 6, period_start: iso(12), period_end: iso(5),
      impressions: 42000, clicks: 1680, conversions: 52, spend: "630.00", revenue: "2140.00",
      ctr: "0.0400", conversion_rate: "0.0310", roi: "3.40", cpc: "0.38", cpa: "12.12",
      decision: "scale", decision_reason: "ROI 3.40 高于阈值 2.5，建议放量",
    },
    {
      ad_experiment_id: 2, name: "1025 人群定向实验", status: "running", generated_asset_id: null, promotion_link_id: 2,
      daily_budget: "120.00", record_count: 2, period_start: iso(6), period_end: iso(4),
      impressions: 8600, clicks: 296, conversions: 9, spend: "630.00", revenue: "1840.00",
      ctr: "0.0344", conversion_rate: "0.0304", roi: "2.92", cpc: "2.13", cpa: "70.00",
      decision: "keep", decision_reason: "数据积累中，维持预算继续观察",
    },
  ],
};

const COMPETITORS = [
  { id: 1, product_id: 1, name: "竞品 A · 某北极绒鹅绒被", platform: "tmall", url: "https://example.com/c/1", price: "529.00", sales_hint: "月销 2 万+", title: "95 白鹅绒冬被抗菌", main_image: null, selling_points: ["95% 白鹅绒", " lockdown 锁绒工艺"], review_keywords: ["蓬松", "无异味", "略重"], created_at: iso(30), updated_at: iso(4) },
  { id: 2, product_id: 1, name: "竞品 B · 家居鹅绒被经典款", platform: "jd", url: "https://example.com/c/2", price: "459.00", sales_hint: "月销 8000+", title: "可水洗鹅绒被", main_image: null, selling_points: ["可水洗", "静音面料"], review_keywords: ["轻薄", "跑绒", "客服好"], created_at: iso(28), updated_at: iso(4) },
];

const COMPETITOR_MONITORS = [
  { id: 1, product_id: 1, competitor_id: 1, status: "active", interval_days: 7, last_checked_at: iso(2), next_check_at: iso(-5), last_snapshot_id: 1, note: null, snapshots: [], created_at: iso(20), updated_at: iso(2) },
];

const AGENTS = [
  { key: "market_intelligence", version: "v1", description: "市场情报：采集竞品、价格带与评论关键词", tools: ["competitor.collect", "competitor.monitor.run"] },
  { key: "product_strategy", version: "v1", description: "商品策略：诊断定位、价格带与人群洞察", tools: ["product.read", "performance.read"] },
  { key: "creative_strategy", version: "v1", description: "创意策略：产出主图/脚本/标题创意方案", tools: ["creative.plan"] },
  { key: "content_production", version: "v1", description: "内容生产：驱动图片/视频生成任务", tools: ["image.generate", "video.generate"] },
  { key: "growth_experiment", version: "v1", description: "增长实验：设计并执行投放 A/B 实验", tools: ["ads.experiment.create", "promotion.link.generate"] },
  { key: "performance_review", version: "v1", description: "周期复盘：聚合表现数据输出复盘报告", tools: ["performance.read"] },
  { key: "inventory_operations", version: "v1", description: "库存运营：补货建议与库存调整建议", tools: ["inventory.read", "inventory.adjust"] },
  { key: "quality_compliance", version: "v1", description: "质量合规：黑名单规则 + LLM 评审双门禁", tools: [] },
];

const WORKFLOWS = [
  { key: "product_diagnosis_optimization", version: "v1", title: "商品诊断优化", description: "诊断商品并产出优化方案", agents: ["product_strategy", "creative_strategy", "quality_compliance"], required_context_any: ["product_id"], default_risk_level: "R1" },
  { key: "creative_content_production", version: "v1", title: "创意内容生产", description: "生成主图/视频素材并落地资产", agents: ["creative_strategy", "content_production", "quality_compliance"], required_context_any: ["product_id"], default_risk_level: "R2" },
  { key: "competitor_monitoring", version: "v1", title: "竞品监控", description: "定期采集竞品价格与卖点变化", agents: ["market_intelligence"], required_context_any: ["product_id"], default_risk_level: "R1" },
  { key: "growth_experiment", version: "v1", title: "投放增长实验", description: "设计投放实验并跟踪 ROI 决策", agents: ["growth_experiment", "performance_review"], required_context_any: ["product_id"], default_risk_level: "R2" },
  { key: "periodic_review", version: "v1", title: "周期复盘", description: "聚合近周期表现输出复盘与建议", agents: ["performance_review"], required_context_any: ["store_id"], default_risk_level: "R0" },
  { key: "inventory_operations", version: "v1", title: "库存运营", description: "库存预警分析与补货/调整建议", agents: ["inventory_operations"], required_context_any: ["store_id"], default_risk_level: "R2" },
  { key: "store_inspection", version: "v1", title: "店铺巡检", description: "多维度例行巡检并输出健康分", agents: ["market_intelligence", "performance_review"], required_context_any: ["store_id"], default_risk_level: "R1" },
];

const AGENT_TASKS = [
  {
    id: 1, workspace_id: 1, conversation_id: null, requested_by_user_id: 1,
    workflow_key: "product_diagnosis_optimization", workflow_version: "v1",
    title: "云感轻氧羽绒被 · 商品诊断优化", intent: "诊断并给出创意优化方案",
    status: "completed", risk_level: "R1", context_scope: { product_id: 1 }, input_payload: {},
    result_summary: { summary: "输出 3 条创意方案并入选 1 条" }, version_manifest: {},
    error: null, cancelled_at: null, finished_at: iso(5), created_at: iso(5), updated_at: iso(5),
  },
  {
    id: 2, workspace_id: 1, conversation_id: null, requested_by_user_id: 1,
    workflow_key: "creative_content_production", workflow_version: "v1",
    title: "零感美容仪 Pro · 主图素材生产", intent: "生成 2 张主图素材",
    status: "awaiting_approval", risk_level: "R2", context_scope: { product_id: 2 }, input_payload: {},
    result_summary: {}, version_manifest: {},
    error: null, cancelled_at: null, finished_at: null, created_at: iso(1), updated_at: iso(1),
  },
  {
    id: 3, workspace_id: 1, conversation_id: null, requested_by_user_id: 1,
    workflow_key: "competitor_monitoring", workflow_version: "v1",
    title: "羽绒被竞品周度监控", intent: "采集竞品价格与卖点变化",
    status: "running", risk_level: "R1", context_scope: { product_id: 1 }, input_payload: {},
    result_summary: {}, version_manifest: {},
    error: null, cancelled_at: null, finished_at: null, created_at: iso(0), updated_at: iso(0),
  },
];

const AGENT_APPROVALS = [
  {
    id: 1, workspace_id: 1, task_id: 2, run_id: 102, requested_by_user_id: 1, decided_by_user_id: null,
    action_key: "workflow.accept_result", risk_level: "R2", status: "pending",
    request_payload: { summary: "AI 生成了 2 张主图素材，等待人工确认后发布" }, decision_payload: {},
    note: null, expires_at: iso(-1), decided_at: null, created_at: iso(1), updated_at: iso(1),
  },
  {
    id: 2, workspace_id: 1, task_id: 1, run_id: 101, requested_by_user_id: 1, decided_by_user_id: 1,
    action_key: "workflow.accept_result", risk_level: "R1", status: "approved",
    request_payload: { summary: "商品诊断与创意方案确认" }, decision_payload: { action: "approve" },
    note: "方案 A 可用", expires_at: iso(-4), decided_at: iso(5), created_at: iso(5), updated_at: iso(5),
  },
];

const AGENT_MEMORIES = [
  {
    id: 1, workspace_id: 1, created_by_user_id: 1, scope_type: "workspace", scope_id: null,
    memory_key: "brand_voice", schema_version: "v1",
    content: { guideline: "文案语气亲切专业，避免绝对化承诺（如“最好”“第一”）" },
    source_type: "manual", source_reference: {}, status: "active",
    effective_at: iso(30), expires_at: null, revoked_at: null, created_at: iso(30), updated_at: iso(30),
  },
  {
    id: 2, workspace_id: 1, created_by_user_id: 1, scope_type: "product", scope_id: "1",
    memory_key: "price_guardrail", schema_version: "v1",
    content: { rule: "云感轻氧羽绒被促销价不低于 449 元" },
    source_type: "manual", source_reference: {}, status: "active",
    effective_at: iso(20), expires_at: null, revoked_at: null, created_at: iso(20), updated_at: iso(20),
  },
];

const MODEL_SETTINGS = {
  text: { base_url: "https://api.siliconflow.cn/v1", api_key_masked: "sk-****demo", has_api_key: true, model: "Qwen3-35B-A3B（演示）" },
  image: { provider: "jimeng", base_url: "https://jimeng.example.com", api_key_masked: "jm-****demo", has_api_key: true, model: "即梦图片 3.0（演示）", size: "1024x1024", workspace_id: "demo", poll_interval_seconds: 5, poll_max_attempts: 60 },
  video: { provider: "jimeng", base_url: "https://jimeng.example.com", api_key_masked: "jm-****demo", has_api_key: true, model: "即梦视频（演示）", size: "1280x720", duration: 5, workspace_id: "demo", poll_interval_seconds: 10, poll_max_attempts: 60 },
};

const USERS = [
  DEMO_USER,
  { ...DEMO_USER, id: 2, email: "operator@demo.com", display_name: "演示运营 B", role: "editor" },
];

const GRANTS: Array<{ id: number; user_id: number; user_email: string; user_display_name: string; role: string; created_at: string }> = [
  { id: 1, user_id: 2, user_email: "operator@demo.com", user_display_name: "演示运营 B", role: "viewer", created_at: iso(0) },
];

// ───────────────────────── 工具函数 ─────────────────────────

function productDetail(id: number) {
  const product = PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0];
  const skus = SKUS.filter((s) => s.product_id === id);
  return {
    ...product,
    skus,
    platform_mappings: [],
    competitors: COMPETITORS.filter((c) => c.product_id === id),
    competitor_monitors: COMPETITOR_MONITORS.filter((m) => m.product_id === id),
    creative_plans: CREATIVE_PLANS.filter((c) => c.product_id === id),
    performance_records: PERFORMANCE_RECORDS,
    review_reports: [
      { id: 1, product_id: id, period_start: iso(30), period_end: iso(0), summary: "近 30 天 ROI 稳定在 2.6-3.4，主图方案 A 胜出；库存告警需要关注。", insights: ["晚间时段转化率高于均值 38%", "主图方案 A 的 CTR 领先方案 B 22%"], next_actions: ["对方案 A 追加 20% 预算", "补货 MRJ-PRO-标准 SKU"], created_at: iso(1), updated_at: iso(1) },
    ],
    ad_recommendations: [],
    ad_experiments: AD_EXPERIMENTS,
    promotion_links: PROMOTION_LINKS,
    generated_assets: [],
    diagnoses: [DIAGNOSIS],
    generation_jobs: [],
    public_link_parse_tasks: [],
  };
}

function inventorySummary(storeId: number) {
  const rows = SKUS.filter((s) => PRODUCTS.find((p) => p.id === s.product_id)?.store_id === storeId).map((s) => ({
    product_id: s.product_id,
    product_name: PRODUCTS.find((p) => p.id === s.product_id)?.name ?? "",
    sku_id: s.id, sku_code: s.sku_code, sku_name: s.name,
    quantity: s.inventory_item.quantity, locked_quantity: s.inventory_item.locked_quantity,
    available_quantity: s.inventory_item.quantity - s.inventory_item.locked_quantity,
    warning_threshold: s.inventory_item.warning_threshold,
    is_low_stock: s.inventory_item.quantity <= s.inventory_item.warning_threshold,
    location: s.inventory_item.location,
  }));
  return {
    store_id: storeId,
    sku_count: rows.length,
    total_quantity: rows.reduce((a, r) => a + r.quantity, 0),
    total_locked_quantity: rows.reduce((a, r) => a + r.locked_quantity, 0),
    total_available_quantity: rows.reduce((a, r) => a + r.available_quantity, 0),
    low_stock_count: rows.filter((r) => r.is_low_stock).length,
    rows,
  };
}

const MOVEMENTS = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({
  id: i, product_id: SKUS[i % 4].product_id,
  product_name: PRODUCTS.find((p) => p.id === SKUS[i % 4].product_id)?.name ?? "",
  sku_id: SKUS[i % 4].id, sku_code: SKUS[i % 4].sku_code, sku_name: SKUS[i % 4].name,
  movement_type: (["inbound", "outbound", "adjustment", "lock"] as const)[i % 4],
  quantity_delta: i % 2 === 0 ? 20 + i : -(5 + i),
  locked_delta: i % 4 === 3 ? 4 : 0,
  before_quantity: 100, after_quantity: 100 + (i % 2 === 0 ? 20 + i : -(5 + i)),
  before_locked_quantity: 6, after_locked_quantity: 6 + (i % 4 === 3 ? 4 : 0),
  reason: i % 4 === 0 ? "采购入库" : i % 4 === 1 ? "订单出库" : i % 4 === 2 ? "盘点调整" : "活动锁库存",
  operator_name: "演示运营", created_at: iso(i),
}));

function buildTrend(days: number) {
  const points = [];
  for (let i = days - 1; i >= 0; i--) {
    const wave = Math.sin(i / 2.7) * 0.18 + Math.cos(i / 6.1) * 0.12;
    const base = 8600 + (days - i) * 62;
    const revenue = Math.round(base * (1 + wave));
    const clicks = Math.round(revenue / 3.4);
    const conversions = Math.round(clicks * 0.031 + (i % 5) * 2);
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    points.push({ period_start: day.toISOString().slice(0, 10), revenue: revenue.toFixed(2), clicks, conversions });
  }
  return { days, points };
}

function nextId(rows: Array<{ id: number }>) {
  return rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
}

const CSV_TEMPLATES: Record<string, string> = {
  "field-mapping.csv": "字段,必填,说明,示例\nname,是,商品名称,云感轻氧羽绒被\nplatform,是,平台,tmall\nprice,否,售价,499.00\nselling_points,否,卖点（分号分隔）,95%白鹅绒;可机洗\n",
  "products.csv": "name,platform,category,price,cost,target_audience,selling_points\n演示商品A,tmall,家纺,499.00,268.00,白领家庭,95%白鹅绒;可机洗\n演示商品B,douyin,美容仪器,1299.00,640.00,精致女性,射频+微电流\n",
  "sku-inventory.csv": "product_name,sku_code,sku_name,price,quantity,warning_threshold\n演示商品A,SKU-A-1,标准款,499.00,100,30\n",
  "performance-records.csv": "product_name,period_start,period_end,impressions,clicks,conversions,spend,revenue\n演示商品A,2026-10-01,2026-10-07,12000,420,13,210.00,620.00\n",
};

/**
 * 侧栏徽标汇总：从演示数据实时推导，保证导航徽标与列表数量一致。
 * 2026-10-14 修复：此前 mock 只在 POST 里实现该接口，而前端 app-shell / sidebar-summary 走 GET，
 * 导致演示版侧栏徽标恒为空白（请求落到 404 分支）。POST 与 GET 现在共用本函数。
 */
function buildSidebarSummary() {
  return {
    products: PRODUCTS.length,
    stores: STORES.length,
    low_stock_skus: SKUS.filter((s) => s.inventory_item.quantity <= s.inventory_item.warning_threshold).length,
    pending_approvals: AGENT_APPROVALS.filter((a) => a.status === "pending").length,
    active_tasks: AGENT_TASKS.filter((t) => ["queued", "running", "awaiting_approval"].includes(t.status)).length,
  };
}

// ───────────────────────── 路由 ─────────────────────────

export async function GET(request: Request, { params }: Params) {
  const { path } = await params;
  const route = path.join("/");
  const url = new URL(request.url);

  // 精确匹配
  const exact: Record<string, () => unknown> = {
    "auth/me": () => DEMO_USER,
    workspaces: () => [WORKSPACE],
    products: () => PRODUCTS,
    stores: () => STORES,
    users: () => USERS,
    "model-settings": () => MODEL_SETTINGS,
    // 侧栏徽标汇总（GET）：导航 60s 轮询本接口
    "workspace/sidebar-summary": () => buildSidebarSummary(),
    "dashboard/overview": () => ({
      product_count: PRODUCTS.length,
      active_sku_count: SKUS.length,
      inventory_alert_count: 3,
      active_creative_plan_count: CREATIVE_PLANS.length,
      pending_approval_count: 1,
      revenue_last_30d: "326480.55",
      avg_roi_last_30d: "2.87",
    }),
    "dashboard/inventory-alerts": () => ({
      total: 3,
      rows: SKUS.filter((s) => s.inventory_item.quantity <= s.inventory_item.warning_threshold).map((s) => ({
        product_id: s.product_id, product_name: PRODUCTS.find((p) => p.id === s.product_id)?.name ?? "",
        sku_id: s.id, sku_code: s.sku_code, sku_name: s.name,
        quantity: s.inventory_item.quantity, locked_quantity: s.inventory_item.locked_quantity,
        available_quantity: s.inventory_item.quantity - s.inventory_item.locked_quantity,
        warning_threshold: s.inventory_item.warning_threshold,
      })),
    }),
    "automation/overview": () => ({
      generated_at: new Date().toISOString(),
      system_heartbeats: [
        { name: "Outbox 事件分发", task: "maintenance.dispatch_outbox", every_seconds: 5, description: "把已提交的 Agent 任务派发到执行队列" },
        { name: "Agent 运行时维护", task: "maintenance.agent_runtime", every_seconds: 30, description: "回收超时租约、重投中断任务、过期审批自动处理" },
      ],
      competitor_monitors: [
        { id: 1, product_id: 1, product_name: "云感轻氧羽绒被", status: "active", interval_days: 7, last_checked_at: iso(2), next_check_at: iso(-5), overdue: true },
        { id: 2, product_id: 3, product_name: "山野冷萃咖啡液 30 条", status: "active", interval_days: 14, last_checked_at: iso(3), next_check_at: iso(-11), overdue: false },
      ],
      active_agent_tasks: AGENT_TASKS.filter((t) => ["queued", "running", "awaiting_approval"].includes(t.status)),
      generation_jobs_active: 1,
      agent_runs_queued: 1,
      agent_runs_running: 1,
    }),
    "digital-human/credentials": () => json({ detail: "数字人凭证未配置" }, 503),
  };
  if (exact[route]) return json(exact[route]());

  // dashboard/performance-trend?days=N
  if (route === "dashboard/performance-trend") {
    const days = Math.min(90, Math.max(7, Number(url.searchParams.get("days") ?? 30)));
    return json(buildTrend(days));
  }

  // CSV 模板
  if (route.startsWith("workspace/templates/")) {
    const name = route.slice("workspace/templates/".length);
    const body = CSV_TEMPLATES[name] ?? CSV_TEMPLATES["field-mapping.csv"];
    return new NextResponse(body, {
      status: 200,
      headers: { "Content-Type": "text/csv; charset=utf-8" },
    });
  }

  // ── Agent 平台 ──
  const agentMatch = route.match(/^workspaces\/(\d+)\/agent\/(.+)$/);
  if (agentMatch) {
    const sub = agentMatch[2];
    if (sub === "catalog")
      return json({
        coordinator: { key: "ecommerce_operations_agent", version: "v1", description: "总控 Agent：意图路由与多 Agent 调度", tools: [] },
        agents: AGENTS,
        workflows: WORKFLOWS,
      });
    if (sub === "tasks") return json(AGENT_TASKS);
    if (sub === "approvals") return json(AGENT_APPROVALS);
    if (sub === "memories") return json(AGENT_MEMORIES);
    if (sub === "conversations") return json([]);
  }

  // ── 商品维度 ──
  const prodMatch = route.match(/^products\/(\d+)(?:\/(.+))?$/);
  if (prodMatch) {
    const pid = Number(prodMatch[1]);
    const sub = prodMatch[2];
    if (!sub) return json(productDetail(pid));
    switch (sub) {
      case "skus":
        return json(SKUS.filter((s) => s.product_id === pid));
      case "performance-records":
        return json(PERFORMANCE_RECORDS);
      case "promotion-links":
        return json(PROMOTION_LINKS);
      case "competitors":
        return json(COMPETITORS.filter((c) => c.product_id === pid));
      case "ad-experiments/dashboard":
        return json({ ...AD_EXPERIMENT_DASHBOARD, product_id: pid });
      case "agent-runs":
        return json(AGENT_RUNS.filter((r) => r.product_id === pid));
      case "diagnoses":
        return json([DIAGNOSIS]);
      default:
        return json({ detail: `演示版未实现该接口：${route}` }, 404);
    }
  }

  // ── 店铺维度 ──
  const storeMatch = route.match(/^stores\/(\d+)(?:\/(.+))?$/);
  if (storeMatch) {
    const sid = Number(storeMatch[1]);
    const sub = storeMatch[2];
    if (!sub) return json(STORES.find((s) => s.id === sid) ?? STORES[0]);
    switch (sub) {
      case "inventory-summary":
        return json(inventorySummary(sid));
      case "grants":
        return json(GRANTS);
      case "inventory-movements":
        return json(MOVEMENTS);
      case "inventory-advice":
        return json({
          source: "demo",
          summary: "3 个 SKU 低于预警线，其中「冬款加厚」缺口最大（差 24 件）；建议优先补货并暂停其投放放量。",
          risks: ["冬款加厚 200×230 可用量 6，仅够 2 天销售", "美容仪 Pro 锁定占比 33%，存在超卖风险"],
          replenishment_actions: ["冬款加厚：建议补货 120 件（7 天销量 × 安全系数 1.4）", "咖啡液：按当前动销可延后 5 天补货"],
          operation_actions: ["美容仪 Pro：释放过期锁定的 6 件库存", "设置冬款低于 15 件时自动提醒"],
          ad_controls: ["冬款加厚补货到位前，投放预算下调 50%", "主推切换到秋款轻薄（库存充足）"],
          raw_output: {},
        });
      default:
        return json({ detail: `演示版未实现该接口：${route}` }, 404);
    }
  }

  // ── 旧版 agent-runs 详情 ──
  const runMatch = route.match(/^agent-runs\/(\d+)$/);
  if (runMatch) {
    const run = AGENT_RUNS.find((r) => r.id === Number(runMatch[1]));
    return run ? json(run) : json({ detail: "run 不存在" }, 404);
  }

  // ── agent-runs SSE 事件流（演示版：一次性回放既有事件后立即收流） ──
  const streamMatch = route.match(/^agent-runs\/(\d+)\/events\/stream$/);
  if (streamMatch) {
    const run = AGENT_RUNS.find((r) => r.id === Number(streamMatch[1]));
    const frames = (run?.events ?? []).slice(0, 4).map(
      (event) => `event: agent_event\ndata: ${JSON.stringify(event)}\n\n`,
    );
    frames.push("event: done\ndata: {}\n\n");
    return new Response(frames.join(""), {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  }

  return json({ detail: `演示版未实现该接口：${route}` }, 404);
}

export async function POST(request: Request, { params }: Params) {
  const { path } = await params;
  const route = path.join("/");

  if (route === "auth/login") {
    return json({ access_token: "demo-token-not-real", token_type: "bearer", user: DEMO_USER });
  }

  // ── 侧栏徽标汇总（POST 兼容保留，与 GET 共用同一份推导逻辑） ──
  if (route === "workspace/sidebar-summary") {
    return json(buildSidebarSummary());
  }

  // ── 创建类操作：返回带 id 的最小合法对象，让 UI 走成功分支 ──
  const createRoutes: Record<string, () => unknown> = {
    products: () => ({ ...PRODUCTS[0], id: nextId(PRODUCTS), name: "新建演示商品", created_at: iso(0), updated_at: iso(0) }),
    stores: () => ({ ...STORES[0], id: nextId(STORES), name: "新建演示店铺", platform_accounts: [], created_at: iso(0), updated_at: iso(0) }),
    users: () => ({ ...DEMO_USER, id: nextId(USERS), email: "new@demo.com", display_name: "新成员" }),
    "workspace/demo-data": () => ({ ok: true, products: 3, stores: 2, skus: 12, performance_records: 6 }),
    "workspace/imports/products": () => ({ ok: true, imported: 8, skipped: 0, errors: [] }),
    "workspace/imports/sku-inventory": () => ({ ok: true, imported: 12, skipped: 0, errors: [] }),
    "workspace/imports/performance-records": () => ({ ok: true, imported: 30, skipped: 0, errors: [] }),
    "model-settings/test": () => ({ ok: true, latency_ms: 432, model: MODEL_SETTINGS.text.model, message: "连接成功（演示固定返回）" }),
  };
  if (createRoutes[route]) return json(createRoutes[route]());

  const prodMatch = route.match(/^products\/(\d+)\/(.+)$/);
  if (prodMatch) {
    const pid = Number(prodMatch[1]);
    const sub = prodMatch[2];
    const made: Record<string, () => unknown> = {
      "diagnoses/generate": () => ({ ...DIAGNOSIS, id: nextId([DIAGNOSIS]), product_id: pid, created_at: iso(0), updated_at: iso(0) }),
      "creative-plans/main-images/generate": () => ({ ...CREATIVE_PLANS[0], id: nextId(CREATIVE_PLANS), product_id: pid, created_at: iso(0), updated_at: iso(0) }),
      "creative-plans/video-scripts/generate": () => ({ ...CREATIVE_PLANS[1], id: nextId(CREATIVE_PLANS), product_id: pid, created_at: iso(0), updated_at: iso(0) }),
      "promotion-links/generate": () => ({ ...PROMOTION_LINKS[0], id: nextId(PROMOTION_LINKS), product_id: pid, click_count: 0, created_at: iso(0), updated_at: iso(0) }),
      "review-reports/generate": () => ({ id: nextId([{ id: 1 }]), product_id: pid, period_start: iso(30), period_end: iso(0), summary: "（演示）复盘报告已生成：ROI 稳定，建议对胜出方案放量。", insights: ["晚间转化高于均值", "主图方案 A 领先"], next_actions: ["追加预算", "补货预警 SKU"], created_at: iso(0), updated_at: iso(0) }),
      "ad-experiments/generate": () => ({ ...AD_EXPERIMENTS[0], id: nextId(AD_EXPERIMENTS), product_id: pid, status: "running", created_at: iso(0), updated_at: iso(0) }),
      "ad-recommendations/generate": () => ({ id: 1, product_id: pid, source: "agent", summary: "（演示）建议对主图方案 A 放量 20%，并暂停低效人群包。", content: {}, confirmation_status: "pending", confirmed_by_user_id: null, confirmed_at: null, confirmation_note: null, created_at: iso(0), updated_at: iso(0) }),
      "assets/sync": () => ({ synced: 2 }),
    };
    if (made[sub]) return json(made[sub]());
    if (sub === "agent-runs") {
      return json({
        ...AGENT_RUNS[0], id: nextId(AGENT_RUNS), product_id: pid, status: "queued",
        thread_id: `run-${Date.now()}`, task_id: null, started_at: null, finished_at: null,
        created_at: iso(0), updated_at: iso(0), events: [], reviews: [],
      });
    }
  }

  const agentMatch = route.match(/^workspaces\/(\d+)\/agent\/(.+)$/);
  if (agentMatch) {
    const sub = agentMatch[2];
    if (sub === "tasks")
      return json({
        ...AGENT_TASKS[2], id: nextId(AGENT_TASKS), title: "新建 Agent 任务", status: "queued",
        created_at: iso(0), updated_at: iso(0),
      });
    if (sub === "memories")
      return json({ ...AGENT_MEMORIES[0], id: nextId(AGENT_MEMORIES), created_at: iso(0), updated_at: iso(0) });
    if (sub === "conversations")
      return json({ id: 1, workspace_id: Number(agentMatch[1]), title: "新对话", status: "active", created_at: iso(0), updated_at: iso(0) });
    const decision = sub.match(/^approvals\/(\d+)\/decision$/);
    if (decision) {
      return json({
        ...AGENT_APPROVALS[0], id: Number(decision[1]), status: "approved",
        decided_by_user_id: 1, decided_at: iso(0), decision_payload: { action: "approve" }, updated_at: iso(0),
      });
    }
  }

  // 取消 / 重试类：一律返回成功标记
  if (route.endsWith("/cancel") || route.endsWith("/retry")) {
    return json({ ok: true, status: route.endsWith("/cancel") ? "cancelled" : "queued" });
  }

  if (route === "model-settings") {
    return json(MODEL_SETTINGS);
  }

  return json({ detail: `演示版未实现该操作：${route}` }, 404);
}

// ───────────────────────── PUT（店铺授权 upsert） ─────────────────────────

export async function PUT(request: Request, { params }: Params) {
  const { path } = await params;
  const route = path.join("/");

  const grantMatch = route.match(/^stores\/(\d+)\/grants$/);
  if (grantMatch) {
    const payload = (await request.json()) as { user_email?: string; role?: string };
    const email = (payload.user_email ?? "").trim().toLowerCase();
    const user = USERS.find((u) => u.email === email);
    if (!user) {
      return json({ detail: "用户不存在，请先在「设置-成员管理」中创建账号（演示可填 operator@demo.com）" }, 404);
    }
    if (payload.role !== "viewer" && payload.role !== "editor") {
      return json({ detail: "角色只能是：viewer / editor" }, 422);
    }
    const existing = GRANTS.find((g) => g.user_id === user.id);
    if (existing) {
      existing.role = payload.role;
      return json(existing);
    }
    const grant = {
      id: nextId(GRANTS),
      user_id: user.id,
      user_email: user.email,
      user_display_name: user.display_name,
      role: payload.role,
      created_at: iso(0),
    };
    GRANTS.push(grant);
    return json(grant);
  }

  return json({ detail: `演示版未实现该接口：${route}` }, 404);
}

// ───────────────────────── DELETE（店铺授权撤销） ─────────────────────────

export async function DELETE(_request: Request, { params }: Params) {
  const { path } = await params;
  const route = path.join("/");

  const revokeMatch = route.match(/^stores\/(\d+)\/grants\/(\d+)$/);
  if (revokeMatch) {
    const userId = Number(revokeMatch[2]);
    const index = GRANTS.findIndex((g) => g.user_id === userId);
    if (index >= 0) {
      GRANTS.splice(index, 1);
      return new Response(null, { status: 204 });
    }
    return json({ detail: "授权不存在" }, 404);
  }

  return json({ detail: `演示版未实现该接口：${route}` }, 404);
}
