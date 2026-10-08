# AI 电商运营助手（后端 + 前端工作台）

从业务数据、模型生成、媒体任务到 Agent 审批与系统交付的 AI 电商运营助手。
后端 FastAPI（`api/`），前端为现成工作台（`web/`，Next.js App Router）。

---

## 1. 运行拓扑

```text
浏览器 / Swagger → FastAPI API → MySQL
                         │
                         ├→ Redis → Celery Worker → 模型服务（文本 / 图片 / 视频）
                         └→ uploads（API 与 Worker 共享）
```

- `api` 与 `worker` 必须使用**同一个 MySQL**、**同一个 Redis**、**相同的模型配置**，
  并挂载**同一个 `api-uploads` 卷**。只共享数据库而不共享 uploads，会出现
  「任务成功但素材 URL 打不开」。

## 2. 目录结构

```text
ecommerce-operation-assistant
├── docker-compose.yml          # 标准交付编排（mysql/redis/agent-checkpoints/api/worker/web）
├── docker-compose.offline.yml  # 离线变体：直接用已构建镜像，不执行 build
├── .env.example                # 部署变量模板（复制为 .env 后填写真实值）
├── .env                        # 部署者私有，绝不提交
├── api/                        # FastAPI 后端
│   ├── Dockerfile              # API 与 Worker 共用（构建上下文都是 ./api）
│   ├── .dockerignore
│   ├── alembic.ini / alembic/  # 数据库迁移
│   ├── app/                    # 应用源码（含 worker/ agents/ services/ api/routes/）
│   └── tests/                  # Pytest
└── web/                        # Next.js 前端工作台
    ├── Dockerfile              # 多阶段生产构建
    └── src/                    # 页面 + BFF 路由
```

## 3. 快速开始（Docker Compose）

1. 准备部署配置（**不要**用本地 `api/.env` 代替它）：

   ```powershell
   copy .env.example .env
   # 编辑 .env：填写 MYSQL_ROOT_PASSWORD / REDIS_PASSWORD / AGENT_POSTGRES_PASSWORD /
   # AUTH_SECRET_KEY，以及 LLM_* / IMAGE_* / VIDEO_* 模型配置
   ```

   > 注意：Compose 只读取**项目根目录**的 `.env` 做变量替换；`api/.env` 是本地
   > uv 开发用的，容器不会自动读取它。这正是「本地能调用、换成 Docker 后没有
   > 模型配置」的常见原因。

2. 校验并构建：

   ```powershell
   docker compose config --quiet
   docker compose build api worker
   docker compose run --rm --no-deps api python -c "import fastapi, sqlalchemy, pymysql, psycopg, celery, langgraph, alembic, uvicorn; print('API dependencies OK')"
   ```

3. 启动整套：

   ```powershell
   docker compose up -d --build
   docker compose ps          # 6 个服务，基础服务应 healthy
   ```

4. 打开 `http://127.0.0.1:${API_PORT}/docs` 与 `http://127.0.0.1:${WEB_PORT}` 验收。

> 无外网环境（无法拉取 `python:3.12-slim` / `node:22-slim` 等基础镜像）时，
> 用已构建好的镜像走离线变体：`docker compose -f docker-compose.offline.yml up -d`。

## 4. 本地开发（不使用容器）

```powershell
cd api
uv sync                                   # 安装依赖
uv run uvicorn app.main:app --reload      # 起 API（默认 127.0.0.1:8000）
uv run pytest -q                          # 回归测试

cd ..\web
npm.cmd ci && npm.cmd run dev             # 起前端（127.0.0.1:3000）
```

- 本地学习可令 `TASK_QUEUE_BACKEND=inline`（后台任务同步执行，只需 MySQL）；
  需要真实 Worker 时改为 `celery`，并另起 Worker：
  `uv run celery -A app.worker.celery_app.celery_app worker --loglevel=INFO -Q generation,agent,agent.workflow,maintenance`
  （Windows 上必须加 `--pool=solo`）。
- `web/.env.local` 的前端后端地址应指向 `http://127.0.0.1:8000`。

## 5. 环境变量

完整清单见 `.env.example`。要点：

| 变量 | 说明 |
|---|---|
| `MYSQL_ROOT_PASSWORD` / `MYSQL_DATABASE` | MySQL 口令与库名 |
| `REDIS_PASSWORD` | API、Worker、Redis 共用同一口令 |
| `AGENT_POSTGRES_USER/PASSWORD/DATABASE` | Agent checkpoint 库；Compose 映射为 `AGENT_CHECKPOINT_*` |
| `AUTH_SECRET_KEY` | 认证密钥；更换后已有登录 Token 失效 |
| `MYSQL_PORT` / `REDIS_PORT` / `AGENT_POSTGRES_PORT` / `API_PORT` / `WEB_PORT` | 宿主机映射端口 |
| `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` | 文本模型 |
| `IMAGE_PROVIDER=BASE_URL/API_KEY/MODEL` | 图片模型（即梦密钥格式为 `AK:SK`） |
| `VIDEO_PROVIDER=BASE_URL/API_KEY/MODEL` | 视频模型 |

> 容器内连接数据库请使用**服务名**（`mysql:3306` / `redis:6379` /
> `agent-checkpoints:5432`），不要写 `127.0.0.1` —— 容器里的 `127.0.0.1` 指容器自己。

## 6. 故障排查（按现象定位边界）

| 现象 | 先检查什么 | 常见原因 |
|---|---|---|
| 打不开 `/docs` | API 进程与映射端口 | Uvicorn 未启动、端口被占用、导入报错 |
| 接口返回 401/403 | 是否已登录、Token 是否过期、角色权限 | 未授权、权限不足 |
| 数据库连接失败 | `DATABASE_URL` 与 MySQL 健康状态 | 主机名错误、口令错误、MySQL 未就绪 |
| 任务一直 `pending` | `TASK_QUEUE_BACKEND`、Redis、Worker 日志 | Worker 未启动、队列名不一致、Redis 不可达 |
| 任务一直 `running` | Worker 日志、租约、维护任务 | Worker 中断、供应商长时间无响应、无超时扫描 |
| 任务 `failed` | 任务事件与安全错误摘要 | 模型配置、供应商账户、提示词或网络异常 |
| 素材 URL 打不开 | API 与 Worker 的 uploads 共享卷 | 文件写到了另一个容器、路径不一致 |
| 本地能调用、容器内变量为空 | 是否只改了 `api/.env`，根 `.env` 是否漏填 | Compose 只读根 `.env` |
| 改了文件还是旧值 | 是否只执行了 `restart` | `restart` 不更新创建时的环境变量，需 `up -d --force-recreate` |
| 环境变量正确但用旧模型 | 数据库是否保存过模型设置 | 数据库模型设置会覆盖环境变量 |

标准排查顺序：① Swagger 最小健康检查确认 API 活着 → ② `docker compose ps` 看基础服务健康 → ③ 查询业务记录/任务事件（不要凭前端猜测）→ ④ 看 API 与 Worker 日志（错误只记摘要，不打印密钥）→ ⑤ 替身测试复现逻辑问题，真实供应商问题再查账户/模型名/额度/网络 → ⑥ 修复后重跑对应章节 Pytest，再做 Swagger 验收。

## 7. 最终验收链路

登录 → 创建商品 → 创建竞品与经营资料 → 测试文本模型 → 生成诊断与创意 →
提交媒体任务 → 查询素材 → 创建 Agent Task → 人工审批并恢复 → 查看业务结果。

> `202`、`pending`、`running` 都**不代表**最终成功，必须看到任务进入
> `succeeded` / `completed` 且素材可访问才算通过。

## 8. 交付清单

- 不交付 `.env`、真实密钥、数据库备份或真实上传素材；
- `web` 源码、`package.json`、`package-lock.json` 在项目中，不携带 `node_modules`、`.next`、`.env.local`；
- 提供 `.env.example`、锁文件（`api/uv.lock`、`web/package-lock.json`）、迁移文件（`api/alembic/`）与本文档；
- Swagger 可完成后端验收；API / Worker / MySQL / Redis / uploads 的部署边界明确；
- 如实标记未执行的真实供应商或部署验证。
