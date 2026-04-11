// Vercel Node.js Serverless Function 용 공통 응답 헬퍼.
// CORS + JSON 직렬화 + 예외 → HTTP status 매핑.

import { BadRequest, NotFound } from './logic.js';

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export function sendJson(res, data, status = 200) {
  applyCors(res);
  res.status(status).json(data);
}

export function sendError(res, err) {
  if (err instanceof BadRequest) {
    return sendJson(res, { detail: err.message }, 400);
  }
  if (err instanceof NotFound) {
    return sendJson(res, { detail: err.message }, 404);
  }
  console.error(err);
  return sendJson(
    res,
    { detail: err?.message || 'internal error' },
    500,
  );
}

// OPTIONS preflight 처리 — 진짜 핸들러 호출 전에 먼저 리턴
export function handlePreflight(req, res) {
  if (req.method === 'OPTIONS') {
    applyCors(res);
    res.status(204).end();
    return true;
  }
  return false;
}

// 편의 래퍼: 비동기 핸들러 함수를 감싸 예외를 자동 변환
export async function runHandler(req, res, fn) {
  if (handlePreflight(req, res)) return;
  try {
    const result = await fn();
    if (res.writableEnded) return;
    sendJson(res, result);
  } catch (e) {
    if (res.writableEnded) return;
    sendError(res, e);
  }
}

// req.url → { path, query }
export function parseUrl(req) {
  const url = new URL(req.url, 'http://x');
  return {
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
  };
}

// Vercel 은 JSON body 를 자동 파싱하지만, 문자열로 들어오는 경우 대비
export function readBody(req) {
  const b = req.body;
  if (b == null) return {};
  if (typeof b === 'string') {
    try {
      return JSON.parse(b);
    } catch {
      throw new BadRequest('invalid json body');
    }
  }
  return b;
}
