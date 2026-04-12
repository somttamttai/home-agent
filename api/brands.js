// Vercel Serverless Function — /api/brands
import { authenticateRequest, Unauthorized, Forbidden } from './_lib/auth.js';
import { BadRequest, NotFound } from './_lib/logic.js';
import { parseUrl, readBody, sendJson, sendError, handlePreflight } from './_lib/respond.js';

const SUPABASE_URL = () => process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = () => process.env.SUPABASE_ANON_KEY;

async function supabaseAdmin(path, options = {}) {
  const url = `${SUPABASE_URL()}/rest/v1/${path}`;
  const r = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY(),
      Authorization: `Bearer ${SUPABASE_ANON_KEY()}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`supabase ${r.status}: ${text.slice(0, 200)}`);
  }
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('json')) return r.json();
  return null;
}

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return;

  try {
    const { user, householdId } = await authenticateRequest(req);
    if (!householdId) throw new BadRequest('소속된 집이 없습니다');

    const { path } = parseUrl(req);
    const method = req.method;

    // GET /api/brands
    if (path === '/api/brands' && method === 'GET') {
      const rows = await supabaseAdmin(
        `brand_preferences?household_id=eq.${householdId}&order=item_name.asc`
      );
      const map = {};
      for (const row of (rows || [])) {
        map[row.item_name] = row.brand;
      }
      return sendJson(res, { brands: map, rows: rows || [] });
    }

    // POST /api/brands — 전체 저장 (upsert)
    if (path === '/api/brands' && method === 'POST') {
      const body = readBody(req);
      const brands = body.brands || {};

      await supabaseAdmin(
        `brand_preferences?household_id=eq.${householdId}`,
        { method: 'DELETE' }
      );

      const entries = Object.entries(brands).filter(([k, v]) => k && v);
      if (entries.length > 0) {
        const rows = entries.map(([item_name, brand]) => ({
          household_id: householdId,
          item_name: item_name.trim(),
          brand: brand.trim(),
          updated_at: new Date().toISOString(),
        }));
        await supabaseAdmin('brand_preferences', {
          method: 'POST',
          body: JSON.stringify(rows),
        });
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
