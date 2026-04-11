"""
Supabase 연결 테스트 및 테이블 존재 확인.
anon 키로는 카탈로그 조회가 제한되어 있어, 예상 테이블을 각각 HEAD로 호출해 확인.
"""

import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]

EXPECTED_TABLES = ["consumables", "price_history", "orders"]


def headers():
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    }


def ping():
    """Supabase Auth 헬스체크 (anon 키 유효성 확인)."""
    r = requests.get(f"{SUPABASE_URL}/auth/v1/health",
                     headers={"apikey": SUPABASE_ANON_KEY}, timeout=10)
    return r.status_code, r.text[:200]


def check_table(name):
    """
    PostgREST에 HEAD 요청으로 테이블 존재와 권한을 확인.
    Prefer: count=exact 로 row count 도 가져온다.
    """
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/{name}",
        headers={**headers(),
                 "Range-Unit": "items",
                 "Range": "0-0",
                 "Prefer": "count=exact"},
        timeout=10,
    )
    count = None
    cr = r.headers.get("Content-Range", "")
    if "/" in cr:
        count = cr.split("/")[-1]
    return r.status_code, count, (r.text[:150] if r.status_code >= 400 else "")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    print(f"[Supabase] URL: {SUPABASE_URL}")
    print(f"[Supabase] Key: {SUPABASE_ANON_KEY[:24]}...{SUPABASE_ANON_KEY[-12:]}")
    print()

    status, body = ping()
    print(f"1) Auth health: HTTP {status}  {body}")
    print()

    print("2) 테이블 존재 확인 (PostgREST HEAD)")
    print(f"   {'테이블':<16} {'상태':<10} {'행 수':<10} 비고")
    print("   " + "-" * 70)
    results = {}
    for t in EXPECTED_TABLES:
        code, count, err = check_table(t)
        if code == 200 or code == 206:
            state = "EXISTS"
            note = ""
        elif code == 404:
            state = "MISSING"
            note = "테이블 없음"
        elif code == 401 or code == 403:
            state = "NO_AUTH"
            note = err
        else:
            state = f"HTTP {code}"
            note = err
        results[t] = state
        print(f"   {t:<16} {state:<10} {str(count or '-'):<10} {note}")

    print()
    missing = [t for t, s in results.items() if s != "EXISTS"]
    if not missing:
        print("✅ 모든 테이블이 정상적으로 존재합니다.")
    else:
        print(f"⚠️  누락된 테이블: {', '.join(missing)}")
        print("    → create_tables.sql 내용을 Supabase Dashboard SQL Editor에 붙여넣어 실행하세요.")
        print(f"    → https://supabase.com/dashboard/project/hhrenykdfjluifxbbvge/sql/new")


if __name__ == "__main__":
    main()
