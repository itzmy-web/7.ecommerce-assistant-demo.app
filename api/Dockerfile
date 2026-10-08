FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# 构建期装包用的镜像源。
# ⚠️ 为什么默认走清华源：容器里既没有代理配置（Docker build 默认不继承宿主机代理），
#    直接连 files.pythonhosted.org 会 DNS 解析失败（实测 dns error: Name or service not known）。
#    走国内镜像源不依赖代理，Clash 换端口也不会影响构建。
#    想换回官方源：docker compose build api --build-arg PIP_INDEX_URL= --build-arg UV_INDEX_URL=
#    （传空值即可，ARG 为空时 pip/uv 会回落到默认 PyPI）
ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ARG UV_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple

# 分层技巧：先只 COPY 依赖声明、装完依赖，再 COPY 源码。
# 这样你只改 app 下的代码重建时，docker 会直接复用上一层装好的 .venv，秒级启动。
COPY pyproject.toml uv.lock README.md* ./
RUN pip install --no-cache-dir uv \
 && UV_INDEX_URL="$UV_INDEX_URL" PIP_INDEX_URL="$PIP_INDEX_URL" uv sync --no-dev --python /usr/local/bin/python3

# 单一入口：容器和本地开发都跑 app/main.py（app.main:app）。
# 整目录拷进来（靠 .dockerignore 挡掉 .venv/.env/uploads 等）—— 必须同时包含
# alembic.ini 与 alembic/ 迁移目录，否则 compose 里 `alembic upgrade head` 会报
# "No 'script_location' key found in configuration."；scripts/ 等运行期资源同理。
COPY . .

EXPOSE 8000

# 这里刻意不写 HEALTHCHECK：本 Dockerfile 被 api 与 worker 两个服务共用（构建上下文都是
# ./api），而健康检查的判据两者完全不同 —— api 探 HTTP /health，worker 要探 celery 是否在线。
# 若把 HTTP 探针烘焙进镜像，worker 容器会被误判为 unhealthy（实测踩过）。
# 因此健康检查下沉到 docker-compose.yml：api 探 /health，worker 探 `celery inspect ping`。
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
