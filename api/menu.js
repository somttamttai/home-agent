// Vercel Serverless Function — /api/menu/*
//   GET /api/menu/list?meal_type=아침&exclude=1,2
//     → menu_recipes 필터링, 랜덤 순서로 반환
//   GET /api/menu/ingredients?id=1
//     → 메뉴 + 재료(쿠팡 검색 URL 포함) + 밀키트 URL
//   GET /api/menu/recommend?meal_type=저녁&lat=..&lon=..&exclude=1,2
//     → 랜덤 3개. 위치 좌표 있으면 open-meteo 기온 가져와 보정
//   GET /api/menu/compare?id=1&people=4
//     → 재료 최저가 합 vs 밀키트 최저가 비교 (네이버 쇼핑 검색)
import { authenticateRequest, supabaseAdmin, Unauthorized, Forbidden } from './_lib/auth.js';
import { BadRequest, NotFound } from './_lib/logic.js';
import { parseUrl, sendJson, sendError, handlePreflight } from './_lib/respond.js';
import * as naver from './_lib/naver.js';

// 추운 날 가산점 태그 / 더운 날 가산점 태그
const COLD_TAGS = ['국물', '따뜻한', '겨울', '보양식', '든든'];
const HOT_TAGS  = ['시원한', '여름', '다이어트', '건강', '샐러드'];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function coupangUrl(keyword) {
  return `https://www.coupang.com/np/search?q=${encodeURIComponent(keyword)}&channel=user`;
}

async function fetchTemperature(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&timezone=auto`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = await r.json();
    const t = data?.current?.temperature_2m;
    return typeof t === 'number' ? t : null;
  } catch {
    return null;
  }
}

function reorderByWeather(menus, temp) {
  if (temp == null) return menus;
  const boostTags = temp < 10 ? COLD_TAGS : temp > 25 ? HOT_TAGS : null;
  if (!boostTags) return menus;
  // 태그 겹침 개수만큼 가산. 안정 정렬 위해 원래 위치를 보조 키로 사용.
  return menus
    .map((m, idx) => {
      const tags = m.tags || [];
      const score = tags.filter((t) => boostTags.includes(t)).length;
      return { menu: m, score, idx };
    })
    .sort((a, b) => (b.score - a.score) || (a.idx - b.idx))
    .map((x) => x.menu);
}

function buildMealTypeFilter(mealType) {
  if (!mealType) return '';
  // postgrest 배열 contains: ?col=cs.{val}
  return `&meal_type=cs.{${encodeURIComponent(mealType)}}`;
}

function buildExcludeFilter(excludeStr) {
  if (!excludeStr) return '';
  const ids = String(excludeStr).split(',').map((s) => parseInt(s, 10)).filter((n) => !Number.isNaN(n));
  if (ids.length === 0) return '';
  return `&id=not.in.(${ids.join(',')})`;
}

async function loadMenus(token, mealType, excludeStr) {
  const filter = buildMealTypeFilter(mealType) + buildExcludeFilter(excludeStr);
  const rows = await supabaseAdmin(
    `menu_recipes?select=*${filter}&limit=300`,
    {},
    token,
  );
  return rows || [];
}

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return;

  try {
    const { token } = await authenticateRequest(req);
    const { path, query } = parseUrl(req);
    const method = req.method;

    if (method !== 'GET') throw new NotFound(`no route: ${method} ${path}`);

    if (path === '/api/menu/list') {
      const items = await loadMenus(token, query.meal_type, query.exclude);
      return sendJson(res, { items: shuffle(items) });
    }

    if (path === '/api/menu/ingredients') {
      const id = parseInt(query.id, 10);
      if (Number.isNaN(id)) throw new BadRequest('invalid id');
      const rows = await supabaseAdmin(`menu_recipes?id=eq.${id}&limit=1`, {}, token);
      const menu = rows?.[0];
      if (!menu) throw new NotFound('menu not found');
      const ingredients = (menu.ingredients || []).map((ing) => ({
        ...ing,
        coupang_url: coupangUrl(ing.keyword || ing.name),
      }));
      const milkit_url = menu.milkit_keyword ? coupangUrl(menu.milkit_keyword) : null;
      return sendJson(res, { menu: { ...menu, ingredients, milkit_url } });
    }

    if (path === '/api/menu/recommend') {
      let menus = await loadMenus(token, query.meal_type, query.exclude);
      menus = shuffle(menus);

      const lat = parseFloat(query.lat);
      const lon = parseFloat(query.lon);
      let temp = null;
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
        temp = await fetchTemperature(lat, lon);
        menus = reorderByWeather(menus, temp);
      }
      return sendJson(res, { items: menus.slice(0, 3), temp });
    }

    if (path === '/api/menu/compare') {
      const id = parseInt(query.id, 10);
      if (Number.isNaN(id)) throw new BadRequest('invalid id');
      const people = Math.max(1, parseInt(query.people, 10) || 1);

      const rows = await supabaseAdmin(`menu_recipes?id=eq.${id}&limit=1`, {}, token);
      const menu = rows?.[0];
      if (!menu) throw new NotFound('menu not found');

      // 재료 가격 최저가 합 (각 재료마다 네이버 검색)
      const ingredientPrices = await Promise.all(
        (menu.ingredients || []).map(async (ing) => {
          const kw = ing.keyword || ing.name;
          if (!kw) return { name: ing.name, emoji: ing.emoji, price: null };
          try {
            const items = await naver.search(kw, { display: 10, sort: 'sim' });
            const prices = items.map((i) => i.price).filter((p) => p > 0);
            const cheapest = prices.length > 0 ? Math.min(...prices) : null;
            return { name: ing.name, emoji: ing.emoji, price: cheapest, keyword: kw };
          } catch {
            return { name: ing.name, emoji: ing.emoji, price: null, keyword: kw };
          }
        }),
      );
      const ingredientsTotal = ingredientPrices
        .map((p) => p.price || 0)
        .reduce((s, p) => s + p, 0);

      // 밀키트 최저가
      let milkit = null;
      if (menu.milkit_keyword) {
        try {
          const items = await naver.search(menu.milkit_keyword, { display: 10, sort: 'sim' });
          const valid = items.filter((i) => i.price > 0);
          if (valid.length > 0) {
            const m = valid.sort((a, b) => a.price - b.price)[0];
            milkit = {
              price: m.price,
              title: m.title,
              link: m.link,
              image: m.image,
              mall: m.mall,
            };
          }
        } catch {}
      }

      // 추천 메시지: 단순 비교 (15% 이상 차이만 한쪽 추천)
      let recommendation = null;
      if (milkit && ingredientsTotal > 0) {
        const ratio = ingredientsTotal / milkit.price;
        if (ratio < 0.85) {
          recommendation = `${people}인 기준 재료가 더 저렴해요!`;
        } else if (ratio > 1.15) {
          recommendation = '밀키트가 더 가성비 좋아요!';
        } else {
          recommendation = '비슷한 가격이에요 — 편의성 vs 신선도로 고르세요';
        }
      } else if (!milkit) {
        recommendation = '이 메뉴는 밀키트가 없어요. 재료로 만들어보세요!';
      }

      return sendJson(res, {
        menu: { id: menu.id, name: menu.name },
        people,
        ingredients: ingredientPrices,
        ingredients_total: ingredientsTotal,
        milkit,
        recommendation,
      });
    }

    throw new NotFound(`no route: ${method} ${path}`);
  } catch (e) {
    if (e instanceof Unauthorized) return sendJson(res, { detail: e.message }, 401);
    if (e instanceof Forbidden)    return sendJson(res, { detail: e.message }, 403);
    sendError(res, e);
  }
}
