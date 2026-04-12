// JWT 인증 미들웨어 — Supabase Auth 토큰 검증
// Authorization: Bearer <jwt> 헤더에서 사용자 정보 추출

const SUPABASE_URL = () => process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = () => process.env.SUPABASE_ANON_KEY;

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

export async function authenticateUser(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
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

export async function getHouseholdId(userId) {
  const url = `${SUPABASE_URL()}/rest/v1/household_members?user_id=eq.${userId}&limit=1`;
  const r = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY(),
      Authorization: `Bearer ${SUPABASE_ANON_KEY()}`,
    },
  });
  if (!r.ok) return null;
  const rows = await r.json();
  return rows.length > 0 ? rows[0].household_id : null;
}

export async function authenticateRequest(req) {
  const user = await authenticateUser(req);
  const householdId = await getHouseholdId(user.id);
  return { user, householdId };
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
