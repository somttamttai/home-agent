"""Vercel Python 용 BaseHTTPRequestHandler 공통 베이스."""

from __future__ import annotations

import json
import traceback
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from .logic import BadRequest, NotFound


class APIHandler(BaseHTTPRequestHandler):
    """서브클래스가 route(method, path, query) 를 구현."""

    def route(self, method: str, path: str, query: dict) -> object:
        raise NotImplementedError

    # ── HTTP 메서드 dispatch ─────────────────────────────────────────
    def do_GET(self):    self._dispatch("GET")
    def do_POST(self):   self._dispatch("POST")
    def do_PATCH(self):  self._dispatch("PATCH")
    def do_DELETE(self): self._dispatch("DELETE")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    # ── 내부 유틸 ────────────────────────────────────────────────────
    def _dispatch(self, method: str) -> None:
        try:
            parsed = urlparse(self.path)
            path = parsed.path
            query = {k: v[0] for k, v in parse_qs(parsed.query).items()}
            result = self.route(method, path, query)
            self._send_json(result)
        except BadRequest as e:
            self._send_json({"detail": str(e)}, status=400)
        except NotFound as e:
            self._send_json({"detail": str(e)}, status=404)
        except Exception as e:
            traceback.print_exc()
            self._send_json({"detail": str(e) or e.__class__.__name__}, status=500)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", 0) or 0)
        if not length:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            raise BadRequest("invalid json body")

    def _send_json(self, data: object, status: int = 200) -> None:
        body = json.dumps(data, default=str, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def _cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods",
                         "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, format, *args):
        return  # Vercel 로그를 조용히
