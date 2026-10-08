"""课程测试只使用内存数据库，不读取课堂数据库连接。

pydantic-settings 对同名配置的优先级是「环境变量 > .env 文件」，
所以这里写入的 DATABASE_URL 会覆盖 api/.env 里的课堂 MySQL 连接，
保证 pytest 进程不触碰真实数据库，也不消费真实模型额度。
本文件仅作用于测试进程，不修改 api/.env。
"""

import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["APP_ENV"] = "development"
os.environ["AUTH_SECRET_KEY"] = "course-test-secret-not-for-deployment"
