// /api/household-members — 같은 집 멤버 목록 (이름 포함)
// auth.users 직접 접근 대신 SECURITY DEFINER 함수 호출
import { authenticateRequest, supabaseAdmin, Unauthorized, Forbidden } from './_lib/auth.js';
import { BadRequest, NotFound } from './_lib/logic.js';
import { parseUrl, sendJson, sendError, handlePreflight } from './_lib/respond.js';

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return;

  try {
    const { token, householdId } = await authenticateRequest(req);
    if (!householdId) throw new BadRequest('소속된 집이 없습니다');

    const { path } = parseUrl(req);
    if (path !== '/api/household-members') throw new NotFound(`no route: ${req.method} ${path}`);
    if (req.method !== 'GET') throw new NotFound(`no route: ${req.method} ${path}`);

    // SECURITY DEFINER 함수 호출 — auth.uid() 기반 자동 필터링
    const rows = await supabaseAdmin(
      'rpc/household_members_with_names',
      { method: 'POST', body: '{}' },
      token,
    );
    return sendJson(res, { members: rows || [] });
  } catch (e) {
    if (e instanceof Unauthorized) return sendJson(res, { detail: e.message }, 401);
    if (e instanceof Forbidden)    return sendJson(res, { detail: e.message }, 403);
    sendError(res, e);
  }
}
