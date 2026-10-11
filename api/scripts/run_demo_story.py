"""一键端到端演示故事：登录 → 造演示数据 → 发起 AI 诊断工作流 → 轮询到终态 → 打印看板摘要。

用途：本地起好全栈（docker compose up -d）后，一条命令向观众展示
「导入商品 → AI 诊断 → 创意产出 → 质检审批 → 数据看板」的完整闭环。

用法（在 api/ 目录）：
    uv run python scripts/run_demo_story.py
可选环境变量：
    DEMO_API_BASE   默认 http://127.0.0.1:8002
    DEMO_EMAIL / DEMO_PASSWORD   登录账号（默认读取 BOOTSTRAP_EMAIL/BOOTSTRAP_PASSWORD）
"""

import os
import sys
import time

import httpx

BASE = os.getenv("DEMO_API_BASE", "http://127.0.0.1:8002").rstrip("/")
EMAIL = os.getenv("DEMO_EMAIL", os.getenv("BOOTSTRAP_EMAIL", ""))
PASSWORD = os.getenv("DEMO_PASSWORD", os.getenv("BOOTSTRAP_PASSWORD", ""))

POLL_INTERVAL = 3.0
POLL_TIMEOUT = 300.0


def step(title: str) -> None:
    print(f"\n▶ {title}")


def ok(msg: str) -> None:
    print(f"  ✓ {msg}")


def main() -> int:
    if not EMAIL or not PASSWORD:
        print("请设置 DEMO_EMAIL / DEMO_PASSWORD（或 BOOTSTRAP_EMAIL / BOOTSTRAP_PASSWORD）。")
        return 1

    client = httpx.Client(timeout=60, base_url=BASE)

    step(f"1. 登录 {BASE}")
    resp = client.post("/api/v1/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if resp.status_code != 200:
        print(f"  ✗ 登录失败：{resp.status_code} {resp.text[:200]}")
        return 1
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    ok(f"登录成功：{resp.json()['user']['display_name']}")

    step("2. 生成演示数据（店铺/商品/SKU/库存/表现记录）")
    resp = client.post("/api/v1/workspace/demo-data", headers=headers)
    if resp.status_code != 200:
        print(f"  ✗ 造数失败：{resp.status_code} {resp.text[:200]}")
        return 1
    seeded = resp.json()
    ok(f"店铺 {seeded.get('stores')} / 商品 {seeded.get('products')} / SKU {seeded.get('skus')}")

    step("3. 查看商品池")
    resp = client.get("/api/v1/products", headers=headers)
    products = resp.json()
    if not products:
        print("  ✗ 商品池为空，无法继续")
        return 1
    product = products[0]
    ok(f"选取商品：{product['name']}（#{product['id']}，{product['platform']}）")

    step("4. 发起 AI 诊断工作流（旧版商品级 Agent）")
    resp = client.post(
        f"/api/v1/products/{product['id']}/agent-runs", headers=headers, json={}
    )
    if resp.status_code not in (200, 201, 202):
        print(f"  ✗ 发起失败：{resp.status_code} {resp.text[:200]}")
        return 1
    run = resp.json()
    run_id = run["id"]
    ok(f"Agent Run #{run_id} 已入队（workflow={run.get('workflow_key')}）")

    step("5. 轮询运行状态（需要 LLM 真实调用，最长 5 分钟）")
    deadline = time.time() + POLL_TIMEOUT
    final = None
    while time.time() < deadline:
        data = client.get(f"/api/v1/agent-runs/{run_id}", headers=headers).json()
        status = data.get("status")
        if status in ("completed", "failed", "cancelled"):
            final = data
            break
        print(f"  … {status}")
        time.sleep(POLL_INTERVAL)
    if final is None:
        print("  ✗ 超时：工作流未在时限内完成（检查 LLM 配置与 worker 日志）")
        return 2
    if final["status"] != "completed":
        print(f"  ✗ 终态异常：{final['status']}（error={final.get('error')}）")
        return 2
    qr = final.get("quality_report") or {}
    ok(f"工作流完成：质检 passed={qr.get('passed')} score={qr.get('score')}")

    step("6. 看板摘要（打开 http://localhost:3000/dashboard 可视化查看）")
    resp = client.get("/api/v1/dashboard/overview", headers=headers)
    overview = resp.json()
    ok(
        f"商品 {overview['product_count']} · SKU {overview['active_sku_count']} · "
        f"库存告警 {overview['inventory_alert_count']} · 近 30 天营收 ¥{overview['revenue_last_30d']} · "
        f"ROI {overview['avg_roi_last_30d']}"
    )

    print("\n🎉 端到端演示故事跑完：登录 → 造数 → AI 诊断 → 质检 → 看板")
    return 0


if __name__ == "__main__":
    sys.exit(main())
