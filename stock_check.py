"""
home-agent: 크리넥스 휴지 재고 확인 + 최저가 검색 + Supabase 저장
1) consumables 테이블에 테스트 데이터 등록 (없을 때만)
2) 네이버 쇼핑 API 최저가 검색 → price_history 저장
3) 재고 소진 예상일 계산 및 출력
"""

import os
import re
import sys
from datetime import datetime, timedelta
from html import unescape

import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_ANON_KEY"]
NAVER_ID = os.environ["NAVER_CLIENT_ID"]
NAVER_SECRET = os.environ["NAVER_CLIENT_SECRET"]

SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


# ---------- Supabase helpers ----------
def sb_get(table, params=None):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{table}",
                     headers=SB_HEADERS, params=params, timeout=10)
    r.raise_for_status()
    return r.json()


def sb_insert(table, row):
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers={**SB_HEADERS, "Prefer": "return=representation"},
        json=row,
        timeout=10,
    )
    r.raise_for_status()
    return r.json()[0]


# ---------- 네이버 쇼핑 ----------
def clean_title(t):
    return unescape(re.sub(r"<[^>]+>", "", t))


def parse_specs(title):
    t = title.replace(",", "")
    rolls = length = ply = None
    packs = 1
    m = re.search(r"(\d+)\s*롤", t)
    if m: rolls = int(m.group(1))
    m = re.search(r"(\d+(?:\.\d+)?)\s*(?:m|M|미터)(?![a-zA-Z])", t)
    if m: length = float(m.group(1))
    m = re.search(r"(\d+)\s*겹", t)
    if m: ply = int(m.group(1))
    m = re.search(r"(\d+)\s*팩", t)
    if m:
        packs = int(m.group(1))
    elif re.search(r"1\s*\+\s*1", t):
        packs = 2
    return {"rolls": rolls, "length_m": length, "ply": ply, "packs": packs}


def fetch_cheapest_kleenex():
    """네이버 쇼핑 API에서 크리넥스 휴지 검색 → 단위당 가격 최저 항목 반환."""
    r = requests.get(
        "https://openapi.naver.com/v1/search/shop.json",
        headers={"X-Naver-Client-Id": NAVER_ID,
                 "X-Naver-Client-Secret": NAVER_SECRET},
        params={"query": "크리넥스 휴지", "display": 100, "sort": "sim"},
        timeout=10,
    )
    r.raise_for_status()
    items = r.json()["items"]

    candidates = []
    for it in items:
        title = clean_title(it["title"])
        price = int(it["lprice"])
        specs = parse_specs(title)
        rolls, length, packs = specs["rolls"], specs["length_m"], specs["packs"]
        # 3겹만 + 유효 스펙만
        if specs["ply"] != 3 or not (rolls and length):
            continue
        total_m = rolls * length * packs
        unit = price / total_m
        if not (1 <= unit <= 1000):
            continue
        candidates.append({
            "title": title, "price": price, "mall": it["mallName"],
            "unit_per_m": round(unit, 2), "specs": specs,
        })

    if not candidates:
        return None
    return min(candidates, key=lambda c: c["unit_per_m"])


# ---------- 메인 ----------
def main():
    sys.stdout.reconfigure(encoding="utf-8")

    # 1) consumables 등록 (중복 방지: name으로 체크)
    print("=" * 70)
    print("1) consumables 테이블에 테스트 데이터 등록")
    print("=" * 70)
    existing = sb_get("consumables",
                      {"name": "eq.크리넥스 휴지", "select": "*"})
    if existing:
        item = existing[0]
        print(f"   이미 존재 → id={item['id']} 재사용")
    else:
        item = sb_insert("consumables", {
            "name": "크리넥스 휴지",
            "brand": "유한킴벌리",
            "spec": "3겹",
            "max_stock": 2,
            "current_stock": 1,
            "daily_usage": 0.03,
            "reorder_point": 7,
        })
        print(f"   신규 등록 → id={item['id']}")

    print(f"   name={item['name']} | brand={item['brand']} | spec={item['spec']}")
    print(f"   max={item['max_stock']}팩 | current={item['current_stock']}팩 "
          f"| daily={item['daily_usage']}팩/일 | reorder={item['reorder_point']}일")

    # 2) 네이버 최저가 검색 → price_history
    print()
    print("=" * 70)
    print("2) 네이버 쇼핑 API 최저가 검색 → price_history 저장")
    print("=" * 70)
    best = fetch_cheapest_kleenex()
    if not best:
        print("   ⚠️  조건에 맞는 상품을 찾지 못했습니다.")
        return

    print(f"   🏆 {best['title']}")
    print(f"   💰 {best['price']:,}원 @ {best['mall']}")
    s = best["specs"]
    print(f"   📏 {s['rolls']}롤 × {s['length_m']:g}m × {s['ply']}겹 × {s['packs']}팩")
    print(f"   📊 단위당: {best['unit_per_m']}원/m")

    saved = sb_insert("price_history", {
        "consumable_id": item["id"],
        "mall_name": best["mall"],
        "price": best["price"],
        "unit_price_per_meter": best["unit_per_m"],
        "spec_parsed": best["specs"],
    })
    print(f"   ✅ price_history 저장 완료 → id={saved['id']} "
          f"(checked_at={saved['checked_at']})")

    # 3) 재고 소진 예상일
    print()
    print("=" * 70)
    print("3) 재고 소진 예상")
    print("=" * 70)
    current = float(item["current_stock"])
    daily = float(item["daily_usage"])
    reorder = float(item["reorder_point"])

    days_left = current / daily if daily > 0 else float("inf")
    depletion_date = datetime.now() + timedelta(days=days_left)
    reorder_date = datetime.now() + timedelta(days=days_left - reorder)

    print(f"   현재 재고:  {current}팩")
    print(f"   일일 소비:  {daily}팩/일")
    print(f"   재주문 시점: 소진 {reorder:g}일 전")
    print()
    print(f"   📅 소진 예상: {days_left:.1f}일 후 "
          f"({depletion_date.strftime('%Y-%m-%d')})")
    print(f"   🔔 재주문 권장: {max(days_left - reorder, 0):.1f}일 후 "
          f"({reorder_date.strftime('%Y-%m-%d')})")

    if days_left <= reorder:
        print()
        print(f"   ⚠️  경고: 재주문 시점 도달! 지금 주문하세요.")
        # 예상 주문액 = 최저가
        print(f"      → 최저가 옵션: {best['price']:,}원 @ {best['mall']}")
    else:
        print()
        print(f"   ✅ 아직 여유 있음 ({days_left - reorder:.1f}일 후 재주문)")


if __name__ == "__main__":
    main()
