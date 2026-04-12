// Vercel Serverless Function — /api/auth/*
import { authenticateUser, getHouseholdId, generateInviteCode, supabaseAdmin, Unauthorized, Forbidden } from './_lib/auth.js';
import { BadRequest, NotFound } from './_lib/logic.js';
import { parseUrl, readBody, sendJson, sendError, handlePreflight } from './_lib/respond.js';

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return;

  try {
    const { path } = parseUrl(req);
    const method = req.method;

    // POST /api/auth/household — 집 생성
    if (path === '/api/auth/household' && method === 'POST') {
      const user = await authenticateUser(req);
      const body = readBody(req);
      const name = (body.name || '우리집').trim() || '우리집';

      const existing = await getHouseholdId(user.id);
      if (existing) throw new BadRequest('이미 집에 소속되어 있습니다');

      const inviteCode = generateInviteCode();

      const households = await supabaseAdmin('households', {
        method: 'POST',
        body: JSON.stringify({
          name,
          invite_code: inviteCode,
          owner_id: user.id,
        }),
      });
      const household = households[0];

      await supabaseAdmin('household_members', {
        method: 'POST',
        body: JSON.stringify({
          household_id: household.id,
          user_id: user.id,
          role: 'owner',
        }),
      });

      await supabaseAdmin('family_settings', {
        method: 'POST',
        body: JSON.stringify({
          household_id: household.id,
          adults: 2,
          children: 0,
          infants: 0,
        }),
      });

      return sendJson(res, household, 201);
    }

    // GET /api/auth/household — 내 집 정보
    if (path === '/api/auth/household' && method === 'GET') {
      const user = await authenticateUser(req);
      const householdId = await getHouseholdId(user.id);
      if (!householdId) return sendJson(res, { household: null });

      const rows = await supabaseAdmin(`households?id=eq.${householdId}`);
      if (!rows || rows.length === 0) return sendJson(res, { household: null });

      const members = await supabaseAdmin(
        `household_members?household_id=eq.${householdId}&select=id,user_id,role,joined_at`
      );

      return sendJson(res, { household: rows[0], members });
    }

    // POST /api/auth/join — 초대코드로 참가
    if (path === '/api/auth/join' && method === 'POST') {
      const user = await authenticateUser(req);
      const body = readBody(req);
      let code = (body.code || '').trim().toUpperCase();
      code = code.replace(/^HOME-/, '');
      if (!code || code.length !== 6) throw new BadRequest('유효하지 않은 초대코드입니다');

      const existing = await getHouseholdId(user.id);
      if (existing) throw new BadRequest('이미 집에 소속되어 있습니다');

      const households = await supabaseAdmin(`households?invite_code=eq.${code}`);
      if (!households || households.length === 0) {
        throw new NotFound('초대코드에 해당하는 집을 찾을 수 없습니다');
      }
      const household = households[0];

      await supabaseAdmin('household_members', {
        method: 'POST',
        body: JSON.stringify({
          household_id: household.id,
          user_id: user.id,
          role: 'member',
        }),
      });

      return sendJson(res, { household }, 201);
    }

    // GET /api/auth/invite-code — 초대코드 조회
    if (path === '/api/auth/invite-code' && method === 'GET') {
      const user = await authenticateUser(req);
      const householdId = await getHouseholdId(user.id);
      if (!householdId) throw new NotFound('소속된 집이 없습니다');

      const rows = await supabaseAdmin(`households?id=eq.${householdId}&select=invite_code`);
      if (!rows || rows.length === 0) throw new NotFound('집을 찾을 수 없습니다');

      return sendJson(res, { invite_code: rows[0].invite_code });
    }

    throw new NotFound(`no route: ${method} ${path}`);
  } catch (e) {
    if (e instanceof Unauthorized) return sendJson(res, { detail: e.message }, 401);
    if (e instanceof Forbidden) return sendJson(res, { detail: e.message }, 403);
    sendError(res, e);
  }
}
