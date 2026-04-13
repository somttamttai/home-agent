// Vercel Serverless Function — /api/brands
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

    // GET /api/brands
    if (path === '/api/brands' && method === 'GET') {
      const rows = await supabaseAdmin(
        `brand_preferences?household_id=eq.${householdId}&order=item_name.asc`, {}, token
      );
      const map = {};
      for (const row of (rows || [])) {
        map[row.item_name] = row.brand;
      }
      return sendJson(res, { brands: map, rows: rows || [] });
    }

    // POST /api/brands
    if (path === '/api/brands' && method === 'POST') {
      const body = readBody(req);
      const brands = body.brands || {};

      // 기존 데이터 조회 후 diff 방식으로 처리 (race condition 방지)
      const existing = await supabaseAdmin(
        `brand_preferences?household_id=eq.${householdId}`, {}, token
      );
      const existingMap = {};
      for (const row of (existing || [])) {
        existingMap[row.item_name] = row;
      }

      const entries = Object.entries(brands).filter(([k, v]) => k && v);
      const incomingKeys = new Set(entries.map(([k]) => k.trim()));

      // 삭제: 새 목록에 없는 항목
      const toDelete = Object.keys(existingMap).filter((k) => !incomingKeys.has(k));
      for (const key of toDelete) {
        await supabaseAdmin(
          `brand_preferences?household_id=eq.${householdId}&item_name=eq.${encodeURIComponent(key)}`,
          { method: 'DELETE' },
          token,
        );
      }

      // upsert: 새 항목 또는 변경된 항목
      if (entries.length > 0) {
        const rows = entries.map(([item_name, brand]) => ({
          household_id: householdId,
          item_name: item_name.trim(),
          brand: brand.trim(),
          updated_at: new Date().toISOString(),
        }));
        await supabaseAdmin('brand_preferences', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify(rows),
        }, token);
      }

      return sendJson(res, { ok: true, count: entries.length });
    }

    throw new NotFound(`no route: ${method} ${path}`);
  } catch (e) {
    if (e instanceof Unauthorized) return sendJson(res, { detail: e.message }, 401);
    if (e instanceof Forbidden) return sendJson(res, { detail: e.message }, 403);
    sendError(res, e);
  }
}
