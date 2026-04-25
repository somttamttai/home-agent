// Vercel Serverless Function — /api/fridge-favorites
// 냉장고 즐겨찾기 (자주 구매하는 식재료) CRUD
import { authenticateRequest, supabaseAdmin, Unauthorized, Forbidden } from './_lib/auth.js';
import { BadRequest, NotFound } from './_lib/logic.js';
import { parseUrl, readBody, sendJson, sendError, handlePreflight } from './_lib/respond.js';

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return;

  try {
    const { token, householdId } = await authenticateRequest(req);
    if (!householdId) throw new BadRequest('소속된 집이 없습니다');

    const { path, query } = parseUrl(req);
    const method = req.method;

    if (path !== '/api/fridge-favorites') throw new NotFound(`no route: ${method} ${path}`);

    if (method === 'GET') {
      const rows = await supabaseAdmin(
        `fridge_favorites?household_id=eq.${householdId}&order=sort_order.asc,created_at.asc`,
        {},
        token,
      );
      return sendJson(res, { items: rows || [] });
    }

    if (method === 'POST') {
      const body = readBody(req);
      const name = String(body.name || '').trim();
      if (!name) throw new BadRequest('name is required');
      const row = {
        household_id: householdId,
        name,
        emoji: body.emoji || '🥬',
        search_keyword: body.search_keyword || null,
        sort_order: body.sort_order ?? 0,
      };
      const inserted = await supabaseAdmin('fridge_favorites', {
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
      if (body.name != null)            patch.name = String(body.name).trim();
      if (body.emoji != null)           patch.emoji = body.emoji;
      if (body.search_keyword != null)  patch.search_keyword = body.search_keyword;
      if (body.sort_order != null)      patch.sort_order = body.sort_order;
      if (Object.keys(patch).length === 0) throw new BadRequest('no updatable fields');
      const updated = await supabaseAdmin(
        `fridge_favorites?id=eq.${id}&household_id=eq.${householdId}`,
        { method: 'PATCH', body: JSON.stringify(patch) },
        token,
      );
      const row = Array.isArray(updated) ? updated[0] : updated;
      if (!row) throw new NotFound('favorite not found');
      return sendJson(res, row);
    }

    if (method === 'DELETE') {
      const id = parseInt(query.id, 10);
      if (Number.isNaN(id)) throw new BadRequest('invalid id');
      await supabaseAdmin(
        `fridge_favorites?id=eq.${id}&household_id=eq.${householdId}`,
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
