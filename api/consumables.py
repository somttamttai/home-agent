"""Vercel Serverless Function — /api/consumables/*"""

from __future__ import annotations

from api._lib import logic
from api._lib.base_handler import APIHandler
from api._lib.logic import BadRequest, NotFound


class handler(APIHandler):
    def route(self, method, path, query):
        # /api/consumables
        if path == "/api/consumables":
            if method == "GET":
                return logic.list_consumables()
            if method == "POST":
                return logic.create_consumable(self._read_json())

        # /api/consumables/alerts/low-stock  (고정 경로 우선 매칭)
        if path == "/api/consumables/alerts/low-stock" and method == "GET":
            return logic.low_stock_alerts()

        # /api/consumables/{cid}
        prefix = "/api/consumables/"
        if path.startswith(prefix):
            tail = path[len(prefix):]
            if "/" in tail:
                raise NotFound(f"no route: {method} {path}")
            try:
                cid = int(tail)
            except ValueError:
                raise BadRequest("invalid id")
            if method == "GET":
                return logic.get_consumable(cid)
            if method == "PATCH":
                return logic.update_consumable(cid, self._read_json())
            if method == "DELETE":
                return logic.delete_consumable(cid)

        raise NotFound(f"no route: {method} {path}")
