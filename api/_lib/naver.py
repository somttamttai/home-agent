"""네이버 쇼핑 API + 상품명 파서."""

import os
import re
from html import unescape

import requests

CLIENT_ID = os.environ["NAVER_CLIENT_ID"]
CLIENT_SECRET = os.environ["NAVER_CLIENT_SECRET"]

SHOP_URL = "https://openapi.naver.com/v1/search/shop.json"


def _headers():
    return {
        "X-Naver-Client-Id": CLIENT_ID,
        "X-Naver-Client-Secret": CLIENT_SECRET,
    }


def clean_title(title: str) -> str:
    return unescape(re.sub(r"<[^>]+>", "", title))


def parse_specs(title: str) -> dict:
    t = title.replace(",", "")
    out = {"rolls": None, "length_m": None, "ply": None, "packs": 1}
    m = re.search(r"(\d+)\s*롤", t)
    if m: out["rolls"] = int(m.group(1))
    m = re.search(r"(\d+(?:\.\d+)?)\s*(?:m|M|미터)(?![a-zA-Z])", t)
    if m: out["length_m"] = float(m.group(1))
    m = re.search(r"(\d+)\s*겹", t)
    if m: out["ply"] = int(m.group(1))
    m = re.search(r"(\d+)\s*팩", t)
    if m:
        out["packs"] = int(m.group(1))
    elif re.search(r"1\s*\+\s*1", t):
        out["packs"] = 2
    return out


def unit_price_per_meter(price: int, specs: dict) -> float | None:
    r, l, p = specs.get("rolls"), specs.get("length_m"), specs.get("packs", 1)
    if not (r and l):
        return None
    total_m = r * l * p
    return round(price / total_m, 2) if total_m else None


def search(query: str, display: int = 20, sort: str = "sim") -> list[dict]:
    """네이버 쇼핑 검색. 파싱된 스펙과 단위가격을 함께 반환."""
    r = requests.get(
        SHOP_URL,
        headers=_headers(),
        params={"query": query, "display": display, "sort": sort},
        timeout=10,
    )
    r.raise_for_status()
    items = r.json().get("items", [])

    results = []
    for it in items:
        title = clean_title(it["title"])
        price = int(it["lprice"])
        specs = parse_specs(title)
        results.append({
            "title": title,
            "price": price,
            "mall": it["mallName"],
            "link": it["link"],
            "image": it["image"],
            "productId": it.get("productId"),
            "brand": it.get("brand") or "",
            "category": it.get("category3") or "",
            "specs": specs,
            "unit_per_m": unit_price_per_meter(price, specs),
        })
    return results


def find_cheapest(query: str, ply: int | None = None) -> dict | None:
    """단위가격 최저가. ply 지정 시 같은 겹수만 비교."""
    items = search(query, display=100, sort="sim")
    valid = [
        i for i in items
        if i["unit_per_m"] and 1 <= i["unit_per_m"] <= 1000
        and (ply is None or i["specs"].get("ply") == ply)
    ]
    if not valid:
        return None
    return min(valid, key=lambda x: x["unit_per_m"])
