"""소모품 CRUD + 재고 상태."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from . import supabase

router = APIRouter()


class ConsumableIn(BaseModel):
    name: str
    brand: str | None = None
    spec: str | None = None
    max_stock: float | None = None
    current_stock: float = 0
    daily_usage: float | None = None
    reorder_point: float | None = None


class ConsumableUpdate(BaseModel):
    current_stock: float | None = None
    daily_usage: float | None = None
    reorder_point: float | None = None
    last_ordered_at: datetime | None = None


def _annotate_stock(c: dict) -> dict:
    """재고 예측 정보 추가."""
    current = float(c.get("current_stock") or 0)
    daily = float(c.get("daily_usage") or 0)
    reorder = float(c.get("reorder_point") or 0)

    days_left = (current / daily) if daily > 0 else None
    deplete_at = None
    need_reorder = False

    if days_left is not None:
        deplete_at = (datetime.now(timezone.utc) + timedelta(days=days_left)).isoformat()
        need_reorder = days_left <= reorder

    return {
        **c,
        "days_left": round(days_left, 1) if days_left is not None else None,
        "deplete_at": deplete_at,
        "need_reorder": need_reorder,
    }


@router.get("")
def list_consumables():
    rows = supabase.select("consumables", {"order": "id.asc"})
    return [_annotate_stock(r) for r in rows]


@router.post("")
def create_consumable(body: ConsumableIn):
    row = supabase.insert("consumables", body.model_dump(exclude_none=True))
    return _annotate_stock(row)


@router.get("/alerts/low-stock")
def low_stock_alerts():
    """재고 7일치 이하 (또는 reorder_point 이하) 품목 반환. 푸시알림용."""
    rows = supabase.select("consumables")
    annotated = [_annotate_stock(r) for r in rows]
    return [r for r in annotated if r["need_reorder"]]


@router.get("/{cid}")
def get_consumable(cid: int):
    row = supabase.get_by_id("consumables", cid)
    if not row:
        raise HTTPException(404, "not found")
    return _annotate_stock(row)


@router.patch("/{cid}")
def update_consumable(cid: int, body: ConsumableUpdate):
    patch = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if isinstance(patch.get("last_ordered_at"), datetime):
        patch["last_ordered_at"] = patch["last_ordered_at"].isoformat()
    rows = supabase.update("consumables", {"id": cid}, patch)
    if not rows:
        raise HTTPException(404, "not found")
    return _annotate_stock(rows[0])


@router.delete("/{cid}")
def delete_consumable(cid: int):
    supabase.delete("consumables", {"id": cid})
    return {"ok": True}
