// /api/chores — 집안일 CRUD + 오늘 필터 + 로테이션 전진
//   GET    /api/chores                 → household 전체
//   GET    /api/chores?date=YYYY-MM-DD → 그 날 활성 chore만
//   POST   /api/chores                 → 생성
//   PATCH  /api/chores?id=N            → 수정 (body.action='advance_rotation' 지원)
//   DELETE /api/chores?id=N
import { authenticateRequest, supabaseAdmin, Unauthorized, Forbidden } from './_lib/auth.js';
import { BadRequest, NotFound } from './_lib/logic.js';
import { parseUrl, readBody, sendJson, sendError, handlePreflight } from './_lib/respond.js';

function isActiveOn(chore, date) {
  const day = date.getDay();    // 0=Sun
  const dom = date.getDate();   // 1-31
  switch (chore.repeat_type) {
    case 'none':    return true;
    case 'daily':   return true;
    case 'weekly':  return chore.repeat_day === day;
    case 'monthly': return chore.repeat_day === dom;
    default:        return false;
  }
}

const ALLOWED_FIELDS = new Set([
  'title', 'emoji', 'assignee_id', 'repeat_type', 'repeat_day',
  'rotation_members', 'rotation_index',
]);

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return;

  try {
    const { token, householdId } = await authenticateRequest(req);
    if (!householdId) throw new BadRequest('소속된 집이 없습니다');

    const { path, query } = parseUrl(req);
    if (path !== '/api/chores') throw new NotFound(`no route: ${req.method} ${path}`);
    const method = req.method;

    if (method === 'GET') {
      const rows = await supabaseAdmin(
        `chores?household_id=eq.${householdId}&order=created_at.asc`,
        {},
        token,
      );
      let items = rows || [];
      if (query.date) {
        const d = new Date(`${query.date}T00:00:00`);
        if (!Number.isNaN(d.getTime())) {
          items = items.filter((c) => isActiveOn(c, d));
        }
      }
      return sendJson(res, { items });
    }

    if (method === 'POST') {
      const body = readBody(req);
      const title = String(body.title || '').trim();
      if (!title) throw new BadRequest('title is required');
      const row = {
        household_id: householdId,
        title,
        emoji: body.emoji || '📋',
        assignee_id: body.assignee_id || null,
        repeat_type: body.repeat_type || 'none',
        repeat_day: body.repeat_day ?? null,
        rotation_members: Array.isArray(body.rotation_members) ? body.rotation_members : [],
        rotation_index: 0,
      };
      const inserted = await supabaseAdmin('chores', {
        method: 'POST',
        body: JSON.stringify(row),
      }, token);
      return sendJson(res, Array.isArray(inserted) ? inserted[0] : inserted, 201);
    }

    if (method === 'PATCH') {
      const id = parseInt(query.id, 10);
      if (Number.isNaN(id)) throw new BadRequest('invalid id');
      const body = readBody(req);

      // 특수 action: 로테이션 다음 차례
      if (body.action === 'advance_rotation') {
        const cur = await supabaseAdmin(
          `chores?id=eq.${id}&household_id=eq.${householdId}&select=rotation_members,rotation_index&limit=1`,
          {},
          token,
        );
        const row = (cur || [])[0];
        if (!row) throw new NotFound('chore not found');
        const members = Array.isArray(row.rotation_members) ? row.rotation_members : [];
        const len = members.length;
        if (len === 0) throw new BadRequest('로테이션 멤버가 없어요');
        const nextIdx = ((row.rotation_index || 0) + 1) % len;
        const updated = await supabaseAdmin(
          `chores?id=eq.${id}&household_id=eq.${householdId}`,
          { method: 'PATCH', body: JSON.stringify({ rotation_index: nextIdx, assignee_id: members[nextIdx] }) },
          token,
        );
        return sendJson(res, Array.isArray(updated) ? updated[0] : updated);
      }

      const patch = {};
      for (const k of Object.keys(body)) {
        if (ALLOWED_FIELDS.has(k)) patch[k] = body[k];
      }
      if (Object.keys(patch).length === 0) throw new BadRequest('no updatable fields');
      const updated = await supabaseAdmin(
        `chores?id=eq.${id}&household_id=eq.${householdId}`,
        { method: 'PATCH', body: JSON.stringify(patch) },
        token,
      );
      const row = Array.isArray(updated) ? updated[0] : updated;
      if (!row) throw new NotFound('chore not found');
      return sendJson(res, row);
    }

    if (method === 'DELETE') {
      const id = parseInt(query.id, 10);
      if (Number.isNaN(id)) throw new BadRequest('invalid id');
      await supabaseAdmin(
        `chores?id=eq.${id}&household_id=eq.${householdId}`,
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
