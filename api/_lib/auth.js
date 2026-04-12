// JWT 인증 미들웨어 — Supabase Auth 토큰 검증
// service_role 키가 있으면 사용 (RLS 우회)
// 없으면 사용자 JWT로 요청 (RLS 적용)

const SUPABASE_URL = () => process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = () => process.env.SUPABASE_ANON_KEY;

function getServerKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

export class Unauthorized extends Error {
  constructor(message = '인증이 필요합니다') {
    super(message);
    this.name = 'Unauthorized';
  }
}

export class Forbidden extends Error {
  constructor(message = '접근 권한이 없습니다') {
    super(message);
    this.name = 'Forbidden';
  }
}

export function extractToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  return authHeader.replace(/^Bearer\s+/i, '').trim();
}

export async function authenticateUser(req) {
  const token = extractToken(req);
  if (!token) throw new Unauthorized();

  const r = await fetch(`${SUPABASE_URL()}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY(),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!r.ok) throw new Unauthorized('유효하지 않은 토큰입니다');
  const user = await r.json();
  if (!user || !user.id) throw new Unauthorized('사용자 정보를 가져올 수 없습니다');
  return user;
}

// 서버 사이드 Supabase REST 호출
// service_role 키가 있으면 사용, 없으면 userToken으로 폴백
export async function supabaseAdmin(path, options = {}, userToken = null) {
  const serviceKey = getServerKey();
  const bearerToken = serviceKey || userToken || SUPABASE_ANON_KEY();
  const url = `${SUPABASE_URL()}/rest/v1/${path}`;
  const r = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY(),
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`supabase ${r.status}: ${text.slice(0, 300)}`);
  }
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('json')) return r.json();
  return null;
}

export async function getHouseholdId(userId, userToken = null) {
  const rows = await supabaseAdmin(
    `household_members?user_id=eq.${userId}&limit=1`,
    {},
    userToken,
  );
  return rows && rows.length > 0 ? rows[0].household_id : null;
}

export async function authenticateRequest(req) {
  const token = extractToken(req);
  const user = await authenticateUser(req);
  const householdId = await getHouseholdId(user.id, token);
  return { user, token, householdId };
}

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function formatInviteCode(code) {
  return `HOME-${code}`;
}

export { generateInviteCode };
