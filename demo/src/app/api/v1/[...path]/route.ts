import { NextResponse } from "next/server";

/**
 * 演示版内置 API：真实前端原封不动，这里用静态演示数据充当后端，
 * 让登录 / 首页 / 数据看板 / 数字人引导页在云端单端口环境完整可走通。
 * 所有数据均为虚构演示数据；数字人凭证接口返回 503，与真实后端"未配置"行为一致。
 */

type Params = { params: Promise<{ path: string[] }> };

const now = new Date("2026-10-11T10:00:00+08:00");
const iso = (dayOffset: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - dayOffset);
  return d.toISOString();
};

const DEMO_USER = {
  id: 1,
  email: "demo@demo.com",
  display_name: "演示运营",
  role: "owner",
  status: "active",
  permissions: {
    can_read: true,
    can_edit: true,
    can_manage_users: false,
    can_confirm_ad_actions: true,
  },
  last_login_at: iso(0),
  created_at: iso(120),
  updated_at: iso(0),
};

const PRODUCTS = [
  {
    id: 1,
    store_id: 1,
    name: "云感轻氧羽绒被",
    platform: "tmall",
    category: "家纺",
    price: "499.00",
    cost: "268.00",
    target_audience: "25-40 城市白领家庭",
    selling_points: ["95% 白鹅绒", "抗菌面料", "可机洗"],
    product_url: "https://example.com/p/1",
    external_product_id: "TM-10001",
    platform_status: "在售",
    images: [],
    created_at: iso(90),
    updated_at: iso(3),
  },
  {
    id: 2,
    store_id: 1,
    name: "零感美容仪 Pro",
    platform: "douyin",
    category: "美容仪器",
    price: "1299.00",
    cost: "640.00",
    target_audience: "22-35 精致女性",
    selling_points: ["射频+微电流", "无线续航", "礼盒装"],
    product_url: "https://example.com/p/2",
    external_product_id: "DY-20002",
    platform_status: "在售",
    images: [],
    created_at: iso(60),
    updated_at: iso(2),
  },
  {
    id: 3,
    store_id: 2,
    name: "山野冷萃咖啡液 30 条",
    platform: "jd",
    category: "食品饮料",
    price: "89.00",
    cost: "41.00",
    target_audience: "咖啡刚需上班族",
    selling_points: ["0 蔗糖", "3 秒速溶", "冷热双溶"],
    product_url: "https://example.com/p/3",
    external_product_id: "JD-30003",
    platform_status: "在售",
    images: [],
    created_at: iso(45),
    updated_at: iso(1),
  },
];

const STORES = [
  {
    id: 1,
    name: "云朵家居旗舰店",
    platform: "tmall",
    status: "active",
    external_store_id: "TM-Shop-1",
    owner_name: "土豆",
    note: "演示店铺",
    platform_accounts: [
      {
        id: 1,
        store_id: 1,
        platform: "tmall",
        account_name: "云朵家居主账号",
        external_account_id: "TM-Acc-1",
        status: "active",
        auth_metadata: {},
        note: null,
        created_at: iso(90),
        updated_at: iso(9),
      },
    ],
    created_at: iso(90),
    updated_at: iso(9),
  },
  {
    id: 2,
    name: "山野食品自营店",
    platform: "jd",
    status: "active",
    external_store_id: "JD-Shop-2",
    owner_name: "土豆",
    note: "演示店铺",
    platform_accounts: [],
    created_at: iso(80),
    updated_at: iso(8),
  },
];

function buildTrend(days: number) {
  const points = [];
  for (let i = days - 1; i >= 0; i--) {
    // 固定种子的伪随机波形：周末有小高峰，整体缓慢上行
    const wave = Math.sin(i / 2.7) * 0.18 + Math.cos(i / 6.1) * 0.12;
    const base = 8600 + (days - i) * 62;
    const revenue = Math.round(base * (1 + wave));
    const clicks = Math.round(revenue / 3.4);
    const conversions = Math.round(clicks * 0.031 + (i % 5) * 2);
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    points.push({
      period_start: day.toISOString().slice(0, 10),
      revenue: revenue.toFixed(2),
      clicks,
      conversions,
    });
  }
  return { days, points };
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET(request: Request, { params }: Params) {
  const { path } = await params;
  const route = path.join("/");
  const url = new URL(request.url);

  switch (route) {
    case "auth/me":
      return json(DEMO_USER);
    case "products":
      return json(PRODUCTS);
    case "stores":
      return json(STORES);
    case "dashboard/overview":
      return json({
        product_count: 3,
        active_sku_count: 12,
        inventory_alert_count: 3,
        active_creative_plan_count: 5,
        pending_approval_count: 2,
        revenue_last_30d: "326480.55",
        avg_roi_last_30d: "2.87",
      });
    case "dashboard/performance-trend": {
      const days = Math.min(90, Math.max(7, Number(url.searchParams.get("days") ?? 30)));
      return json(buildTrend(days));
    }
    case "dashboard/inventory-alerts":
      return json({
        total: 3,
        rows: [
          {
            product_id: 2,
            product_name: "零感美容仪 Pro",
            sku_id: 21,
            sku_code: "MRJ-PRO-标准",
            sku_name: "标准款",
            quantity: 18,
            locked_quantity: 6,
            available_quantity: 12,
            warning_threshold: 50,
          },
          {
            product_id: 3,
            product_name: "山野冷萃咖啡液 30 条",
            sku_id: 31,
            sku_code: "KF-30-经典",
            sku_name: "经典烘焙",
            quantity: 36,
            locked_quantity: 12,
            available_quantity: 24,
            warning_threshold: 60,
          },
          {
            product_id: 1,
            product_name: "云感轻氧羽绒被",
            sku_id: 11,
            sku_code: "RYB-200-冬",
            sku_name: "冬款加厚 200×230",
            quantity: 9,
            locked_quantity: 3,
            available_quantity: 6,
            warning_threshold: 30,
          },
        ],
      });
    case "digital-human/credentials":
      // 与真实后端"未配置"行为一致：页面会展示引导卡片
      return json({ detail: "数字人凭证未配置" }, 503);
    default:
      return json({ detail: `演示版未实现该接口：${route}` }, 404);
  }
}

export async function POST(request: Request, { params }: Params) {
  const { path } = await params;
  const route = path.join("/");

  if (route === "auth/login") {
    return json({
      access_token: "demo-token-not-real",
      token_type: "bearer",
      user: DEMO_USER,
    });
  }
  return json({ detail: `演示版未实现该接口：${route}` }, 404);
}
