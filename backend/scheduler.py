"""
일일 가격 체크 + 재고 부족 로그 스케줄러 (로컬 전용).
Vercel Serverless 환경에서는 백그라운드 프로세스가 유지되지 않으므로 사용하지 않음.
(Vercel 에서는 Vercel Cron 으로 HTTP 엔드포인트를 주기 호출하는 방식을 권장)
"""

import logging

from apscheduler.schedulers.background import BackgroundScheduler

from backend._lib import naver, supabase

log = logging.getLogger("home-agent.scheduler")

_scheduler: BackgroundScheduler | None = None


def _check_all_consumables():
    """모든 소모품에 대해 최저가 갱신 + 재고 상태 기록."""
    items = supabase.select("consumables")
    for c in items:
        try:
            best = naver.find_cheapest(c["name"], ply=3)
            if not best:
                continue
            supabase.insert("price_history", {
                "consumable_id": c["id"],
                "mall_name": best["mall"],
                "price": best["price"],
                "unit_price_per_meter": best["unit_per_m"],
                "spec_parsed": best["specs"],
            })
            log.info(f"[price] {c['name']}: {best['price']}원 @ {best['mall']}")

            current = float(c.get("current_stock") or 0)
            daily = float(c.get("daily_usage") or 0)
            reorder = float(c.get("reorder_point") or 0)
            if daily > 0:
                days_left = current / daily
                if days_left <= reorder:
                    log.warning(f"[LOW STOCK] {c['name']}: {days_left:.1f}일 남음")
        except Exception as e:
            log.exception(f"check failed for {c.get('name')}: {e}")


def start_scheduler():
    global _scheduler
    if _scheduler:
        return
    _scheduler = BackgroundScheduler(timezone="Asia/Seoul")
    _scheduler.add_job(
        _check_all_consumables,
        "cron", hour=9, minute=0,
        id="daily_price_check",
        replace_existing=True,
    )
    _scheduler.start()
    log.info("scheduler started (daily 09:00 KST)")


def stop_scheduler():
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        _scheduler = None


def run_once_now():
    """테스트/수동 실행용."""
    _check_all_consumables()
