"""Vercel Serverless Function — /api/prices/*"""

from __future__ import annotations

from api._lib import logic
from api._lib.base_handler import APIHandler
from api._lib.logic import BadRequest, NotFound


class handler(APIHandler):
    def route(self, method, path, query):
        # /api/prices/compare?query=...&ply=...
        if path == "/api/prices/compare" and method == "GET":
            ply_raw = query.get("ply")
            ply = int(ply_raw) if ply_raw else None
            return logic.compare_prices(query.get("query"), ply)

        # /api/prices/history/{cid}?limit=...
        history_prefix = "/api/prices/history/"
        if path.startswith(history_prefix) and method == "GET":
            try:
                cid = int(path[len(history_prefix):])
            except ValueError:
                raise BadRequest("invalid id")
            limit = int(query.get("limit", 50))
            return logic.price_history(cid, limit)

        # /api/prices/refresh/{cid}
        refresh_prefix = "/api/prices/refresh/"
        if path.startswith(refresh_prefix) and method == "POST":
            try:
                cid = int(path[len(refresh_prefix):])
            except ValueError:
                raise BadRequest("invalid id")
            return logic.refresh_price(cid)

        raise NotFound(f"no route: {method} {path}")
