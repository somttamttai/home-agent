"""
네이버 쇼핑 API - 크리넥스 휴지 단위당 가격 분석
상품명에서 롤수/길이/겹수/팩수를 파싱하고, 미터당 가격 기준으로 최저가 순 정렬.
"""

import re
import sys
import requests
from html import unescape

CLIENT_ID = "xUsjdEqi4FUGihKRPacp"
CLIENT_SECRET = "RBPPiGnq7U"

API_URL = "https://openapi.naver.com/v1/search/shop.json"
QUERY = "크리넥스 휴지"
DISPLAY = 100
SORT = "sim"


def fetch_items(query, display=100, sort="sim"):
    headers = {
        "X-Naver-Client-Id": CLIENT_ID,
        "X-Naver-Client-Secret": CLIENT_SECRET,
    }
    params = {"query": query, "display": display, "sort": sort}
    r = requests.get(API_URL, headers=headers, params=params, timeout=10)
    r.raise_for_status()
    return r.json().get("items", [])


def clean_title(title):
    return unescape(re.sub(r"<[^>]+>", "", title))


def parse_specs(title):
    t = title.replace(",", "")

    rolls = None
    m = re.search(r"(\d+)\s*롤", t)
    if m:
        rolls = int(m.group(1))

    length_m = None
    m = re.search(r"(\d+(?:\.\d+)?)\s*(?:m|M|미터)(?![a-zA-Z])", t)
    if m:
        length_m = float(m.group(1))

    ply = None
    m = re.search(r"(\d+)\s*겹", t)
    if m:
        ply = int(m.group(1))

    packs = 1
    m = re.search(r"(\d+)\s*팩", t)
    if m:
        packs = int(m.group(1))
    elif re.search(r"1\s*\+\s*1", t):
        packs = 2
    else:
        m = re.search(r"[x×X*]\s*(\d+)\s*(?:개|팩|세트)?", t)
        if m:
            n = int(m.group(1))
            if 1 < n <= 10:
                packs = n

    return {"rolls": rolls, "length_m": length_m, "ply": ply, "packs": packs}


def compute_unit_price(price, specs):
    rolls = specs["rolls"]
    length_m = specs["length_m"]
    packs = specs["packs"]

    per_m = None
    per_roll = None

    if rolls and length_m:
        total_m = rolls * length_m * packs
        if total_m > 0:
            per_m = price / total_m

    if rolls:
        total_rolls = rolls * packs
        if total_rolls > 0:
            per_roll = price / total_rolls

    return per_m, per_roll


def analyze():
    items = fetch_items(QUERY, DISPLAY, SORT)
    print(f"[네이버 쇼핑] '{QUERY}' 검색 — {len(items)}건 수신\n")

    rows = []
    for it in items:
        title = clean_title(it["title"])
        price = int(it["lprice"])
        specs = parse_specs(title)
        per_m, per_roll = compute_unit_price(price, specs)
        rows.append({
            "title": title,
            "price": price,
            "mall": it["mallName"],
            "rolls": specs["rolls"],
            "length_m": specs["length_m"],
            "ply": specs["ply"],
            "packs": specs["packs"],
            "per_m": per_m,
            "per_roll": per_roll,
        })

    parsed = [r for r in rows if r["per_m"] is not None]
    unparsed = [r for r in rows if r["per_m"] is None]

    sane = [r for r in parsed if 1 <= r["per_m"] <= 1000]
    outliers = [r for r in parsed if not (1 <= r["per_m"] <= 1000)]

    sane.sort(key=lambda r: r["per_m"])

    print(f"파싱 성공: {len(parsed)}건 | 유효 범위: {len(sane)}건 "
          f"| 이상치: {len(outliers)}건 | 파싱 실패: {len(unparsed)}건\n")

    print(f"{'순위':>3}  {'원/m':>7}  {'원/롤':>8}  {'가격':>10}  "
          f"{'롤x길이x겹x팩':<18}  {'쇼핑몰':<12}  상품명")
    print("-" * 140)

    for i, r in enumerate(sane, 1):
        spec_str = (f"{r['rolls']}x{r['length_m']:g}m"
                    f"x{r['ply'] or '?'}겹x{r['packs']}팩")
        title_short = r["title"][:50] + ("…" if len(r["title"]) > 50 else "")
        print(f"{i:>3}  {r['per_m']:>7.1f}  "
              f"{r['per_roll']:>8,.0f}  {r['price']:>10,}  "
              f"{spec_str:<18}  {r['mall'][:12]:<12}  {title_short}")

    if sane:
        prices_per_m = sorted([r["per_m"] for r in sane])
        n = len(prices_per_m)
        avg = sum(prices_per_m) / n
        median = prices_per_m[n // 2]
        print(f"\n[단위당 가격 통계] 최저 {prices_per_m[0]:.1f}원/m | "
              f"중위 {median:.1f}원/m | 평균 {avg:.1f}원/m | "
              f"최고 {prices_per_m[-1]:.1f}원/m")

    if unparsed:
        print(f"\n[파싱 실패 샘플]")
        for r in unparsed[:5]:
            print(f"  - {r['price']:>8,}원 | {r['title'][:70]}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    analyze()
