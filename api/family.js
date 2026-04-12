// Vercel Serverless Function — /api/family
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

    // GET /api/family
    if (path === '/api/family' && method === 'GET') {
      const rows = await supabaseAdmin(
        `family_settings?household_id=eq.${householdId}`
      );
      if (!rows || rows.length === 0) {
        return sendJson(res, { adults: 2, children: 0, infants: 0, household_id: householdId });
      }
      return sendJson(res, rows[0]);
    }

    // POST /api/family
    if (path === '/api/family' && method === 'POST') {
      const body = readBody(req);
      const patch = {
        adults: body.adults != null ? Number(body.adults) : 2,
        children: body.children != null ? Number(body.children) : 0,
        infants: body.infants != null ? Number(body.infants) : 0,
        updated_at: new Date().toISOString(),
      };

      const existing = await supabaseAdmin(
        `family_settings?household_id=eq.${householdId}`
      );

      if (existing && existing.length > 0) {
        const updated = await supabaseAdmin(
          `family_settings?household_id=eq.${householdId}`,
          { method: 'PATCH', body: JSON.stringify(patch) }
        );
        return sendJson(res, updated[0]);
      }

      const created = await supabaseAdmin('family_settings', {
        method: 'POST',
        body: JSON.stringify({ household_id: householdId, ...patch }),
      });
      return sendJson(res, created[0], 201);
    }

    throw new NotFound(`no route: ${method} ${path}`);
  } catch (e) {
    if (e instanceof Unauthorized) return sendJson(res, { detail: e.message }, 401);
    if (e instanceof Forbidden) return sendJson(res, { detail: e.message }, 403);
    sendError(res, e);
  }
}
