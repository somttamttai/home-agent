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


# ── 단위 자동 감지 ─────────────────────────────────────────────────────
def detect_unit(title: str) -> str:
    if re.search(r"화장지|키친타올|두루마리|롤휴지", title):
        return "m"
    if re.search(r"샴푸|린스|바디워시|세제|섬유유연제|컨디셔너|핸드워시", title):
        return "ml"
    if re.search(r"치약|세안제|폼클렌징", title):
        return "g"
    if re.search(r"지퍼백|봉투|청소포|물티슈|드라이시트|마스크", title):
        return "매"
    return "개"


# ── 기존 spec 파서 (UI spec chip 표시용 유지) ──────────────────────────
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


# ── 단위별 총량 파싱 ───────────────────────────────────────────────────
def parse_total_size(title: str, unit: str):
    t = title.replace(",", "")

    packs = 1
    pm = re.search(r"(\d+)\s*팩", t)
    if pm:
        packs = int(pm.group(1))
    elif re.search(r"1\s*\+\s*1", t):
        packs = 2

    if unit == "m":
        r = re.search(r"(\d+)\s*롤", t)
        l = re.search(r"(\d+(?:\.\d+)?)\s*(?:m|M|미터)(?![a-zA-Z])", t)
        if r and l:
            return int(r.group(1)) * float(l.group(1)) * packs
        return None
    if unit == "ml":
        m = re.search(r"(\d+(?:\.\d+)?)\s*(ml|mL|L|l)(?![a-zA-Z])", t)
        if m:
            v = float(m.group(1))
            u = m.group(2).lower()
            return (v * 1000 if u == "l" else v) * packs
        return None
    if unit == "g":
        m = re.search(r"(\d+(?:\.\d+)?)\s*(kg|g)(?![a-zA-Z])", t)
        if m:
            v = float(m.group(1))
            u = m.group(2).lower()
            return (v * 1000 if u == "kg" else v) * packs
        return None
    if unit == "매":
        m = re.search(r"(\d+)\s*매", t)
        if m:
            return int(m.group(1)) * packs
        return None
    if unit == "개":
        ip = re.search(r"(\d+)\s*개입", t)
        if ip:
            return int(ip.group(1)) * packs
        ga = re.search(r"(\d+)\s*개(?!입)", t)
        if ga:
            return int(ga.group(1))
        return packs
    return None


def calc_unit_price(price: int, total_size):
    if not total_size or total_size <= 0:
        return None
    return round(price / total_size, 2)


def search(query: str, display: int = 20, sort: str = "sim") -> list[dict]:
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
        unit = detect_unit(title)
        total_size = parse_total_size(title, unit)
        unit_price = calc_unit_price(price, total_size)
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
            "unit": unit,
            "total_size": total_size,
            "unit_price": unit_price,
        })
    return results


def find_cheapest(query: str, ply: int | None = None) -> dict | None:
    items = search(query, display=100, sort="sim")
    valid = [
        i for i in items
        if i["unit_price"] is not None and i["unit_price"] > 0
        and (ply is None or i["specs"].get("ply") == ply)
    ]
    if not valid:
        return None
    return min(valid, key=lambda x: x["unit_price"])
