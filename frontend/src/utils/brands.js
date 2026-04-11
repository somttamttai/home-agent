// 선호 브랜드 매핑 — { "상품명": "브랜드", ... }
// localStorage 영구 저장
export const BRAND_KEY = 'home-agent-brands'

export function loadBrands() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(BRAND_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : {}
    }
  } catch {}
  return {}
}

export function saveBrands(map) {
  // 빈 문자열은 저장 안 함
  const clean = {}
  for (const [k, v] of Object.entries(map || {})) {
    if (v && String(v).trim()) clean[k] = String(v).trim()
  }
  try {
    localStorage.setItem(BRAND_KEY, JSON.stringify(clean))
  } catch {}
}

export function getPreferredBrand(name) {
  if (!name) return null
  const brands = loadBrands()
  return brands[name.trim()] || null
}

// 검색용 쿼리 빌드:
//   brand 가 있으면 → "브랜드 상품명"
//   brand 가 비었거나 이미 name 에 포함되어 있으면 → 상품명만
export function buildSearchQuery(name, brand) {
  const n = (name || '').trim()
  const b = (brand || '').trim()
  if (!b || n.includes(b)) return n
  return `${b} ${n}`
}
