"""가격 이력 + 가격비교 (네이버 최저가)."""

from fastapi import APIRouter, HTTPException, Query

from . import naver, supabase

router = APIRouter()


@router.get("/compare")
def compare(query: str = Query(..., min_length=2), ply: int | None = None):
    """네이버 쇼핑 최저가 + 단위당 가격 정렬된 상위 20건."""
    items = naver.search(query, display=100, sort="sim")
    if ply is not None:
        items = [i for i in items if i["specs"].get("ply") == ply]
    priced = [
        i for i in items
        if i["unit_per_m"] and 1 <= i["unit_per_m"] <= 1000
    ]
    priced.sort(key=lambda x: x["unit_per_m"])
    cheapest = priced[0] if priced else None
    return {
        "query": query,
        "total": len(items),
        "valid": len(priced),
        "cheapest": cheapest,
        "items": priced[:20],
    }


@router.get("/history/{cid}")
def history(cid: int, limit: int = 50):
    """특정 소모품의 가격 이력."""
    consumable = supabase.get_by_id("consumables", cid)
    if not consumable:
        raise HTTPException(404, "consumable not found")
    rows = supabase.select(
        "price_history",
        {"consumable_id": f"eq.{cid}",
         "order": "checked_at.desc",
         "limit": str(limit)},
    )
    return {"consumable": consumable, "history": rows}


@router.post("/refresh/{cid}")
def refresh(cid: int):
    """해당 소모품의 최저가를 네이버에서 다시 조회하여 price_history에 저장."""
    consumable = supabase.get_by_id("consumables", cid)
    if not consumable:
        raise HTTPException(404, "consumable not found")

    ply = None
    if consumable.get("spec") and "겹" in consumable["spec"]:
        try:
            ply = int(consumable["spec"].split("겹")[0].strip()[-1])
        except ValueError:
            ply = None

    best = naver.find_cheapest(consumable["name"], ply=ply)
    if not best:
        raise HTTPException(404, "no matching product found")

    row = supabase.insert("price_history", {
        "consumable_id": cid,
        "mall_name": best["mall"],
        "price": best["price"],
        "unit_price_per_meter": best["unit_per_m"],
        "spec_parsed": best["specs"],
    })
    return {"saved": row, "best": best}
