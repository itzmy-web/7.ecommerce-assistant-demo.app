"""add store_grants

Revision ID: c5d8e1a4f7b2
Revises: eb096fcef5d3
Create Date: 2026-10-11 21:30:00

店铺级授权表：把普通成员限定到指定店铺（渐进收紧语义）。
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c5d8e1a4f7b2"
down_revision: str | None = "eb096fcef5d3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "store_grants",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="viewer"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("store_id", "user_id", name="uq_store_grant"),
    )
    op.create_index("ix_store_grants_store_id", "store_grants", ["store_id"])
    op.create_index("ix_store_grants_user_id", "store_grants", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_store_grants_user_id", table_name="store_grants")
    op.drop_index("ix_store_grants_store_id", table_name="store_grants")
    op.drop_table("store_grants")
