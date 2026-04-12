// Vercel Serverless Function — /api/categories
import { authenticateRequest, supabaseAdmin, Unauthorized, Forbidden } from './_lib/auth.js';
import { BadRequest, NotFound } from './_lib/logic.js';
import { parseUrl, readBody, sendJson, sendError, handlePreflight } from './_lib/respond.js';

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return;

  try {
    const { user, token, householdId } = await authenticateRequest(req);
    if (!householdId) throw new BadRequest('소속된 집이 없습니다');

    const { path } = parseUrl(req);
    const method = req.method;

    if (path !== '/api/categories') throw new NotFound(`no route: ${method} ${path}`);

    let current = [];
    try {
      const rows = await supabaseAdmin(`households?id=eq.${householdId}&select=custom_categories`, {}, token);
      current = (rows && rows[0]?.custom_categories) || [];
    } catch {
      current = [];
    }

    // GET
    if (method === 'GET') {
      return sendJson(res, { custom: current });
    }

    // POST
    if (method === 'POST') {
      const body = readBody(req);
      const name = (body.name || '').trim();
      const icon = (body.icon || '📦').trim();
      if (!name) throw new BadRequest('카테고리 이름을 입력해주세요');
      if (current.some((c) => c.key === name)) throw new BadRequest('이미 있는 카테고리입니다');

      const updated = [...current, { key: name, icon }];
      await supabaseAdmin(`households?id=eq.${householdId}`, {
        method: 'PATCH',
        body: JSON.stringify({ custom_categories: updated }),
      }, token);
      return sendJson(res, { custom: updated }, 201);
    }

    // PATCH
    if (method === 'PATCH') {
      const body = readBody(req);
      const oldName = (body.old_name || '').trim();
      const newName = (body.name || '').trim();
      const icon = (body.icon || '').trim();
      if (!oldName) throw new BadRequest('기존 카테고리 이름이 필요합니다');

      const updated = current.map((c) => {
        if (c.key !== oldName) return c;
        return { key: newName || c.key, icon: icon || c.icon };
      });
      await supabaseAdmin(`households?id=eq.${householdId}`, {
        method: 'PATCH',
        body: JSON.stringify({ custom_categories: updated }),
      }, token);

      if (newName && newName !== oldName) {
        await supabaseAdmin(`consumables?household_id=eq.${householdId}&category=eq.${encodeURIComponent(oldName)}`, {
          method: 'PATCH',
          body: JSON.stringify({ category: newName }),
        }, token);
      }

      return sendJson(res, { custom: updated });
    }

    // DELETE
    if (method === 'DELETE') {
      const body = readBody(req);
      const name = (body.name || '').trim();
      if (!name) throw new BadRequest('카테고리 이름이 필요합니다');

      const updated = current.filter((c) => c.key !== name);
      await supabaseAdmin(`households?id=eq.${householdId}`, {
        method: 'PATCH',
        body: JSON.stringify({ custom_categories: updated }),
      }, token);

      await supabaseAdmin(`consumables?household_id=eq.${householdId}&category=eq.${encodeURIComponent(name)}`, {
        method: 'PATCH',
        body: JSON.stringify({ category: '기타' }),
      }, token);

      return sendJson(res, { custom: updated });
    }

    throw new NotFound(`no route: ${method} ${path}`);
  } catch (e) {
    if (e instanceof Unauthorized) return sendJson(res, { detail: e.message }, 401);
    if (e instanceof Forbidden) return sendJson(res, { detail: e.message }, 403);
    sendError(res, e);
  }
}
