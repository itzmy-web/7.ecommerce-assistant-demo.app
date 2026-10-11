from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import (
    agent_platform,
    agent_runs,
    auth,
    automation,
    dashboard,
    digital_human,
    health,
    model_settings,
    products,
    promotion_links,
    stores,
    users,
    workspace,
)
from app.core.config import API_DIR, get_settings

settings = get_settings()
app = FastAPI(title=settings.app_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health.router)
app.include_router(auth.router, prefix="/api/v1")
# 第 10–13 章基础业务路由（阶段接入：店铺/商品/SKU/库存/竞品/创意/推广/经营/用户/工作区）
app.include_router(stores.router, prefix="/api/v1")
app.include_router(products.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(workspace.router, prefix="/api/v1")
app.include_router(promotion_links.router, prefix="/api/v1")
# 第 14 章模型配置路由（文本/图片/视频配置读取、保存与连通性测试）
app.include_router(model_settings.router, prefix="/api/v1")
# 第 19–21 章 Agent 路由（Agent 运行/审批/恢复记录，以及平台注册表与工具目录）
app.include_router(agent_runs.router, prefix="/api/v1")
app.include_router(agent_platform.router, prefix="/api/v1")
# 数据看板路由（概览卡片 / 经营趋势 / 库存告警，只读聚合）
app.include_router(dashboard.router, prefix="/api/v1")
# 数字人路由（魔珐星云 SDK 凭证下发，需登录）
app.include_router(digital_human.router, prefix="/api/v1")
app.include_router(automation.router, prefix="/api/v1")

# 生成媒体静态挂载：图片/视频服务会把素材落到 api/uploads，并返回 "/uploads/..." 形式的 URL。
# 该目录必须挂载到根路径，浏览器/前端才能实际取到文件；否则 /uploads/... 会 404，
# 素材记录虽已落库但无法展示。目录不存在时自动创建，避免启动期报错。
UPLOADS_DIR = API_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")