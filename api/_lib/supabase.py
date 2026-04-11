"""Supabase REST API wrapper (anon key)."""

import os
from typing import Any

import requests

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_ANON_KEY"]

BASE = f"{SUPABASE_URL}/rest/v1"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


def select(table: str, params: dict | None = None) -> list[dict]:
    r = requests.get(f"{BASE}/{table}", headers=HEADERS, params=params or {}, timeout=10)
    r.raise_for_status()
    return r.json()


def insert(table: str, row: dict) -> dict:
    r = requests.post(
        f"{BASE}/{table}",
        headers={**HEADERS, "Prefer": "return=representation"},
        json=row, timeout=10,
    )
    r.raise_for_status()
    return r.json()[0]


def update(table: str, match: dict, patch: dict) -> list[dict]:
    params = {k: f"eq.{v}" for k, v in match.items()}
    r = requests.patch(
        f"{BASE}/{table}",
        headers={**HEADERS, "Prefer": "return=representation"},
        params=params, json=patch, timeout=10,
    )
    r.raise_for_status()
    return r.json()


def delete(table: str, match: dict) -> None:
    params = {k: f"eq.{v}" for k, v in match.items()}
    r = requests.delete(f"{BASE}/{table}", headers=HEADERS, params=params, timeout=10)
    r.raise_for_status()


def get_by_id(table: str, item_id: Any) -> dict | None:
    rows = select(table, {"id": f"eq.{item_id}", "limit": 1})
    return rows[0] if rows else None
