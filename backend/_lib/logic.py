"""비즈니스 로직 (로컬 FastAPI 용)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from . import naver, ocr, supabase


class NotFound(Exception):
    pass


class BadRequest(Exception):
    pass


_CREATE_FIELDS = {"name", "brand", "spec", "max_stock", "current_stock",
                  "daily_usage", "reorder_point"}
_UPDATE_FIELDS = {"current_stock", "daily_usage", "reorder_point", "last_ordered_at"}


def _annotate_stock(c: dict) -> dict:
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


def list_consumables() -> list[dict]:
    rows = supabase.select("consumables", {"order": "id.asc"})
    return [_annotate_stock(r) for r in rows]


def create_consumable(body: dict) -> dict:
    if not body.get("name"):
        raise BadRequest("name is required")
    clean = {k: v for k, v in body.items() if k in _CREATE_FIELDS and v is not None}
    row = supabase.insert("consumables", clean)
    return _annotate_stock(row)


def get_consumable(cid: int) -> dict:
    row = supabase.get_by_id("consumables", cid)
    if not row:
        raise NotFound("consumable not found")
    return _annotate_stock(row)


def update_consumable(cid: int, body: dict) -> dict:
    patch = {k: v for k, v in body.items() if k in _UPDATE_FIELDS and v is not None}
    if not patch:
        raise BadRequest("no updatable fields")
    rows = supabase.update("consumables", {"id": cid}, patch)
    if not rows:
        raise NotFound("consumable not found")
    return _annotate_stock(rows[0])


def delete_consumable(cid: int) -> dict:
    supabase.delete("consumables", {"id": cid})
    return {"ok": True}


def low_stock_alerts() -> list[dict]:
    rows = supabase.select("consumables")
    annotated = [_annotate_stock(r) for r in rows]
    return [r for r in annotated if r["need_reorder"]]


def compare_prices(query: str | None, ply: int | None = None) -> dict:
    if not query or len(query) < 2:
        raise BadRequest("query too short")
    items = naver.search(query, display=100, sort="sim")
    if ply is not None:
        items = [i for i in items if i["specs"].get("ply") == ply]
    priced = [i for i in items
              if i["unit_per_m"] and 1 <= i["unit_per_m"] <= 1000]
    priced.sort(key=lambda x: x["unit_per_m"])
    return {
        "query": query,
        "total": len(items),
        "valid": len(priced),
        "cheapest": priced[0] if priced else None,
        "items": priced[:20],
    }


def price_history(cid: int, limit: int = 50) -> dict:
    consumable = supabase.get_by_id("consumables", cid)
    if not consumable:
        raise NotFound("consumable not found")
    rows = supabase.select(
        "price_history",
        {"consumable_id": f"eq.{cid}",
         "order": "checked_at.desc",
         "limit": str(limit)},
    )
    return {"consumable": consumable, "history": rows}


def refresh_price(cid: int) -> dict:
    consumable = supabase.get_by_id("consumables", cid)
    if not consumable:
        raise NotFound("consumable not found")
    ply = None
    spec = consumable.get("spec") or ""
    if "겹" in spec:
        try:
            ply = int(spec.split("겹")[0].strip()[-1])
        except ValueError:
            ply = None
    best = naver.find_cheapest(consumable["name"], ply=ply)
    if not best:
        raise NotFound("no matching product found")
    row = supabase.insert("price_history", {
        "consumable_id": cid,
        "mall_name": best["mall"],
        "price": best["price"],
        "unit_price_per_meter": best["unit_per_m"],
        "spec_parsed": best["specs"],
    })
    return {"saved": row, "best": best}


def barcode_lookup(code: str | None, fmt: str | None = None) -> dict:
    if not code or len(code) < 6:
        raise BadRequest("invalid barcode")
    items = naver.search(code, display=20, sort="sim")
    if not items:
        return {"code": code, "found": False, "items": []}
    return {
        "code": code,
        "format": fmt,
        "found": True,
        "top": items[0],
        "items": items[:10],
    }


def recognize_product_image(image_bytes: bytes) -> dict:
    return ocr.recognize_product(image_bytes)


def parse_receipt(image_bytes: bytes) -> dict:
    return ocr.parse_receipt(image_bytes)
