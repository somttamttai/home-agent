// /api/schedules — 가족 일정 CRUD
//   GET    /api/schedules                          → household 전체 (최근 60일~앞으로 60일)
//   GET    /api/schedules?from=YYYY-MM-DD&to=...   → 날짜 범위
//   GET    /api/schedules?date=YYYY-MM-DD          → 그 날만
//   POST   /api/schedules
//   PATCH  /api/schedules?id=N
//   DELETE /api/schedules?id=N
import { authenticateRequest, supabaseAdmin, Unauthorized, Forbidden } from './_lib/auth.js';
import { BadRequest, NotFound } from './_lib/logic.js';
import { parseUrl, readBody, sendJson, sendError, handlePreflight } from './_lib/respond.js';

const ALLOWED_FIELDS = new Set([
  'title', 'emoji', 'schedule_date', 'memo', 'is_shared',
]);

function isValidDate(s) {
  if (!s || typeof s !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return;

  try {
    const { user, token, householdId } = await authenticateRequest(req);
    if (!householdId) throw new BadRequest('소속된 집이 없습니다');

    const { path, query } = parseUrl(req);
    if (path !== '/api/schedules') throw new NotFound(`no route: ${req.method} ${path}`);
    const method = req.method;

    if (method === 'GET') {
      let filter = `household_id=eq.${householdId}`;
      if (query.date && isValidDate(query.date)) {
        filter += `&schedule_date=eq.${query.date}`;
      } else {
        if (query.from && isValidDate(query.from)) filter += `&schedule_date=gte.${query.from}`;
        if (query.to   && isValidDate(query.to))   filter += `&schedule_date=lte.${query.to}`;
      }
      const rows = await supabaseAdmin(
        `schedules?${filter}&order=schedule_date.asc`,
        {},
        token,
      );
      return sendJson(res, { items: rows || [] });
    }

    if (method === 'POST') {
      const body = readBody(req);
      const title = String(body.title || '').trim();
      if (!title) throw new BadRequest('title is required');
      if (!isValidDate(body.schedule_date)) throw new BadRequest('schedule_date (YYYY-MM-DD) is required');
      const row = {
        household_id: householdId,
        title,
        emoji: body.emoji || '📅',
        schedule_date: body.schedule_date,
        memo: body.memo || null,
        is_shared: body.is_shared !== false,
        created_by: user?.id || null,
      };
      const inserted = await supabaseAdmin('schedules', {
        method: 'POST',
        body: JSON.stringify(row),
      }, token);
      return sendJson(res, Array.isArray(inserted) ? inserted[0] : inserted, 201);
    }

    if (method === 'PATCH') {
      const id = parseInt(query.id, 10);
      if (Number.isNaN(id)) throw new BadRequest('invalid id');
      const body = readBody(req);
      const patch = {};
      for (const k of Object.keys(body)) {
        if (ALLOWED_FIELDS.has(k)) patch[k] = body[k];
      }
      if (Object.keys(patch).length === 0) throw new BadRequest('no updatable fields');
      if (patch.schedule_date && !isValidDate(patch.schedule_date)) throw new BadRequest('invalid schedule_date');
      const updated = await supabaseAdmin(
        `schedules?id=eq.${id}&household_id=eq.${householdId}`,
        { method: 'PATCH', body: JSON.stringify(patch) },
        token,
      );
      const row = Array.isArray(updated) ? updated[0] : updated;
      if (!row) throw new NotFound('schedule not found');
      return sendJson(res, row);
    }

    if (method === 'DELETE') {
      const id = parseInt(query.id, 10);
      if (Number.isNaN(id)) throw new BadRequest('invalid id');
      await supabaseAdmin(
        `schedules?id=eq.${id}&household_id=eq.${householdId}`,
        { method: 'DELETE' },
        token,
      );
      return sendJson(res, { ok: true });
    }

    throw new NotFound(`no route: ${method} ${path}`);
  } catch (e) {
    if (e instanceof Unauthorized) return sendJson(res, { detail: e.message }, 401);
    if (e instanceof Forbidden)    return sendJson(res, { detail: e.message }, 403);
    sendError(res, e);
  }
}
