// 가족 구성원 설정 — localStorage 영구 저장
export const FAMILY_KEY = 'home-agent-family'
export const DEFAULT_FAMILY = { adults: 2, children: 0 }

export function loadFamily() {
  if (typeof window === 'undefined') return DEFAULT_FAMILY
  try {
    const raw = localStorage.getItem(FAMILY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        adults: Number(parsed.adults ?? DEFAULT_FAMILY.adults),
        children: Number(parsed.children ?? DEFAULT_FAMILY.children),
      }
    }
  } catch {}
  return DEFAULT_FAMILY
}

export function saveFamily(family) {
  try {
    localStorage.setItem(FAMILY_KEY, JSON.stringify(family))
  } catch {}
}

// 어린이는 성인의 0.7배 가중치
export function effectivePeople(family) {
  const adults = Math.max(0, Number(family?.adults ?? 0))
  const children = Math.max(0, Number(family?.children ?? 0))
  return adults + children * 0.7
}

// "2인" / "2.7인" 같은 표시용 포맷
export function formatPeople(n) {
  if (n == null || Number.isNaN(n)) return '0'
  return n % 1 === 0 ? `${n}` : n.toFixed(1)
}
