"""数字人（魔珐星云）路由：向前端下发 SDK 初始化凭证。

AppId / AppSecret 只存在于后端 .env 或容器环境变量中；前端登录后调用本接口
动态获取，再初始化 XmovAvatar SDK。凭证未配置时返回 503，由前端给出引导提示。
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.routes.auth import require_view_permission
from app.core.config import get_settings
from app.db.session import get_db
from app.models import User

router = APIRouter(prefix="/digital-human", tags=["digital-human"])
SessionDep = Annotated[Session, Depends(get_db)]


class DigitalHumanCredentials(BaseModel):
    """魔珐星云 SDK 初始化所需的三元组。"""

    app_id: str
    app_secret: str
    gateway_server: str


@router.get("/credentials", response_model=DigitalHumanCredentials)
def get_digital_human_credentials(
    db: SessionDep,
    _current_user: Annotated[User, Depends(require_view_permission)],
) -> DigitalHumanCredentials:
    """下发数字人 SDK 凭证；密钥仅存于后端环境，前端源码零硬编码。"""
    settings = get_settings()
    if not settings.digital_human_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="数字人未配置：请在后端 .env 填写 DIGITAL_HUMAN_APP_ID 与 DIGITAL_HUMAN_APP_SECRET",
        )
    return DigitalHumanCredentials(
        app_id=(settings.digital_human_app_id or "").strip(),
        app_secret=(settings.digital_human_app_secret or "").strip(),
        gateway_server=settings.digital_human_gateway_server,
    )
