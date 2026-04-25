import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '../components/Toast.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import { effectivePeople, loadFamily } from '../utils/family.js'

const SUBTABS = [
  { id: 'fav',     label: '즐겨찾기' },
  { id: 'menu',    label: '메뉴추천' },
  { id: 'plan',    label: '식단계획' },
  { id: 'deals',   label: '오늘특가' },
  { id: 'instant', label: '간편식' },
]

const MEAL_TYPES = [
  { id: '아침', label: '아침', icon: '🌅' },
  { id: '점심', label: '점심', icon: '☀️' },
  { id: '저녁', label: '저녁', icon: '🌙' },
  { id: '야식', label: '야식', icon: '🌃' },
]

const FOOD_EMOJIS = [
  '🥬','🥦','🥒','🍅','🥔','🧅','🧄','🥕','🌽','🍆',
  '🥑','🍄','🍎','🍌','🍊','🍇','🍓','🍉','🥥','🍑',
  '🥩','🍗','🍖','🐟','🦐','🦑','🥚','🥛','🧀','🍞',
  '🍚','🍜','🍲','🥘','🥗','🥪','🥡','🌶️','🥫','🍯',
]

function coupangUrl(keyword) {
  return `https://www.coupang.com/np/search?q=${encodeURIComponent(keyword)}&channel=user`
}

// ── localStorage helpers ────────────────────────────────────────────
function loadRecent() {
  try { return JSON.parse(localStorage.getItem('recentMeals') || '[]') } catch { return [] }
}
function saveRecent(menuId, mealType) {
  const prev = loadRecent().filter((r) => Date.now() - new Date(r.eatenAt).getTime() < 30 * 86400 * 1000)
  prev.unshift({ id: menuId, mealType, eatenAt: new Date().toISOString() })
  localStorage.setItem('recentMeals', JSON.stringify(prev.slice(0, 100)))
}
function recentDaysAgo(menuId, recent) {
  const found = recent.find((r) => r.id === menuId)
  if (!found) return null
  return Math.floor((Date.now() - new Date(found.eatenAt).getTime()) / 86400000)
}

// 주 시작 (월요일 00:00)
function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}
function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function loadPlan(weekStart) {
  try { return JSON.parse(localStorage.getItem(`mealPlan_${dateKey(weekStart)}`) || '{}') } catch { return {} }
}
function savePlan(weekStart, plan) {
  localStorage.setItem(`mealPlan_${dateKey(weekStart)}`, JSON.stringify(plan))
}

export default function Fridge() {
  const [tab, setTab] = useState('fav')
  return (
    <div className="page-enter">
      <div className="page">
        <h1 className="page-title">냉장고</h1>
        <div className="subtabs">
          {SUBTABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`subtab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'fav'     && <FavoritesTab />}
        {tab === 'menu'    && <MenuTab />}
        {tab === 'plan'    && <PlanTab />}
        {tab === 'deals'   && <DealsTab query="로켓프레시 특가" emptyHint="오늘의 로켓프레시 특가를 불러오는 중이에요" />}
        {tab === 'instant' && <InstantTab />}
      </div>
    </div>
  )
}

// ── 즐겨찾기 ────────────────────────────────────────────────────────
function FavoritesTab() {
  const toast = useToast()
  const { authHeaders } = useAuth()
  const [items, setItems] = useState(null)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/fridge-favorites', { headers: authHeaders() })
      if (!r.ok) throw new Error()
      const data = await r.json()
      setItems(data.items || [])
    } catch {
      setItems([])
      toast('즐겨찾기 불러오기 실패')
    }
  }, [authHeaders, toast])

  useEffect(() => { load() }, [load])

  const onAdd = async (name, emoji) => {
    try {
      const r = await fetch('/api/fridge-favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name, emoji }),
      })
      if (!r.ok) throw new Error()
      setAdding(false)
      load()
    } catch { toast('추가 실패') }
  }

  const onDelete = async (id) => {
    if (!confirm('삭제할까요?')) return
    try {
      const r = await fetch(`/api/fridge-favorites?id=${id}`, { method: 'DELETE', headers: authHeaders() })
      if (!r.ok) throw new Error()
      setItems((prev) => prev.filter((x) => x.id !== id))
    } catch { toast('삭제 실패') }
  }

  return (
    <div className="subtab-content">
      {adding && <FavoriteAddForm onSave={onAdd} onCancel={() => setAdding(false)} />}
      <div className="fav-grid">
        <button type="button" className="fav-card add" onClick={() => setAdding(true)}>
          <span className="emoji">＋</span>
          <span className="name">추가</span>
        </button>
        {items?.map((it) => (
          <div key={it.id} className="fav-card-wrap">
            <a className="fav-card" href={coupangUrl(it.search_keyword || it.name)} target="_blank" rel="noopener noreferrer">
              <span className="emoji">{it.emoji || '🥬'}</span>
              <span className="name">{it.name}</span>
            </a>
            <button type="button" className="fav-del" onClick={() => onDelete(it.id)} aria-label="삭제">×</button>
          </div>
        ))}
      </div>
      {items != null && items.length === 0 && !adding && (
        <div className="empty" style={{ marginTop: 24 }}>
          <div className="big-icon">🥬</div>
          <div className="title">자주 사는 식재료를 등록해보세요</div>
          <div>탭하면 쿠팡 로켓프레시로 바로 이동해요</div>
        </div>
      )}
    </div>
  )
}

function FavoriteAddForm({ onSave, onCancel }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🥬')
  const submit = (e) => {
    e?.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSave(trimmed, emoji)
  }
  return (
    <form className="fav-add-form" onSubmit={submit}>
      <div className="row">
        <span className="picked-emoji">{emoji}</span>
        <input className="search-input" placeholder="이름 (예: 계란)" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="emoji-grid">
        {FOOD_EMOJIS.map((e) => (
          <button key={e} type="button" className={`emoji-cell ${emoji === e ? 'active' : ''}`} onClick={() => setEmoji(e)}>{e}</button>
        ))}
      </div>
      <div className="form-actions">
        <button type="button" className="btn tonal" onClick={onCancel}>취소</button>
        <button type="submit" className="btn">저장</button>
      </div>
    </form>
  )
}

// ── 메뉴추천 ────────────────────────────────────────────────────────
function MenuTab() {
  const toast = useToast()
  const { authHeaders } = useAuth()
  const [mealType, setMealType] = useState(() => {
    // 시간대로 기본 끼니 추정
    const h = new Date().getHours()
    if (h < 10) return '아침'
    if (h < 14) return '점심'
    if (h < 21) return '저녁'
    return '야식'
  })
  const [menus, setMenus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [picks, setPicks] = useState(null)
  const [picksTemp, setPicksTemp] = useState(null)
  const [picksLoading, setPicksLoading] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const recent = useMemo(() => loadRecent(), [selectedId])

  const loadMenus = useCallback(async (mt) => {
    setLoading(true)
    setMenus(null)
    try {
      const r = await fetch(`/api/menu/list?meal_type=${encodeURIComponent(mt)}`, { headers: authHeaders() })
      if (!r.ok) throw new Error()
      const data = await r.json()
      setMenus(data.items || [])
    } catch {
      setMenus([])
      toast('메뉴 불러오기 실패')
    } finally {
      setLoading(false)
    }
  }, [authHeaders, toast])

  useEffect(() => { loadMenus(mealType) }, [mealType, loadMenus])

  const onRecommend = useCallback(() => {
    setPicksLoading(true)
    setPicks(null)
    setPicksTemp(null)
    const exclude = loadRecent().slice(0, 5).map((r) => r.id).join(',')

    const fetchWith = async (extra = {}) => {
      const params = new URLSearchParams({ meal_type: mealType, exclude, ...extra })
      try {
        const r = await fetch(`/api/menu/recommend?${params}`, { headers: authHeaders() })
        if (!r.ok) throw new Error()
        const data = await r.json()
        setPicks(data.items || [])
        setPicksTemp(data.temp ?? null)
      } catch {
        toast('추천 실패')
      } finally {
        setPicksLoading(false)
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWith({ lat: String(pos.coords.latitude), lon: String(pos.coords.longitude) }),
        () => fetchWith(),
        { timeout: 4000, maximumAge: 600000 },
      )
    } else {
      fetchWith()
    }
  }, [mealType, authHeaders, toast])

  if (selectedId) {
    return (
      <MenuDetail
        id={selectedId}
        mealType={mealType}
        onBack={() => setSelectedId(null)}
        onAte={() => { saveRecent(selectedId, mealType); toast('기록했어요 🍽️'); setSelectedId(null) }}
      />
    )
  }

  return (
    <div className="subtab-content">
      <div className="subtabs mini">
        {MEAL_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`subtab ${mealType === t.id ? 'active' : ''}`}
            onClick={() => setMealType(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <button type="button" className="menu-suggest-btn" onClick={onRecommend} disabled={picksLoading}>
        {picksLoading ? '추천 가져오는 중…' : '🌤️ 오늘 뭐 먹지?'}
      </button>

      {picks && picks.length > 0 && (
        <div className="menu-picks">
          <div className="section-title">
            오늘의 추천
            {picksTemp != null && <span className="weather-pill">현재 {Math.round(picksTemp)}°C</span>}
          </div>
          {picks.map((m) => (
            <button key={m.id} type="button" className="menu-pick-card" onClick={() => setSelectedId(m.id)}>
              <span className="emoji">{firstEmoji(m)}</span>
              <span className="info">
                <span className="name">{m.name}</span>
                {m.tags && m.tags.length > 0 && <span className="reason">{m.tags.slice(0, 3).join(' · ')}</span>}
              </span>
              <span className="arrow">›</span>
            </button>
          ))}
        </div>
      )}

      <div className="section-title" style={{ marginTop: 16 }}>{mealType} 메뉴 ({menus?.length ?? 0})</div>
      {loading && (
        <div className="empty"><div className="spinner" /><div style={{ marginTop: 14 }}>불러오는 중…</div></div>
      )}
      {!loading && menus && (
        <div className="menu-grid">
          {menus.map((m) => {
            const days = recentDaysAgo(m.id, recent)
            return (
              <button key={m.id} type="button" className="menu-card" onClick={() => setSelectedId(m.id)}>
                <span className="emoji">{firstEmoji(m)}</span>
                <span className="name">{m.name}</span>
                {m.category && <span className="cat">{m.category}</span>}
                {days != null && <span className="recent">{days === 0 ? '오늘 먹음' : `${days}일 전`}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function firstEmoji(menu) {
  const ing = (menu.ingredients || [])[0]
  return ing?.emoji || '🍽️'
}

// ── 메뉴 상세 (재료 vs 밀키트 + 가격비교) ───────────────────────────
function MenuDetail({ id, mealType, onBack, onAte }) {
  const { authHeaders } = useAuth()
  const toast = useToast()
  const [view, setView] = useState('ing')
  const [data, setData] = useState(null)
  const [compare, setCompare] = useState(null)
  const [comparing, setComparing] = useState(false)
  const [people, setPeople] = useState(() => Math.max(1, Math.round(effectivePeople(loadFamily()))))

  useEffect(() => {
    fetch(`/api/menu/ingredients?id=${id}`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => setData(d.menu))
      .catch(() => toast('메뉴 로드 실패'))
  }, [id, authHeaders, toast])

  const runCompare = useCallback(async () => {
    setComparing(true)
    setCompare(null)
    try {
      const r = await fetch(`/api/menu/compare?id=${id}&people=${people}`, { headers: authHeaders() })
      if (!r.ok) throw new Error()
      setCompare(await r.json())
    } catch {
      toast('가격 비교 실패')
    } finally {
      setComparing(false)
    }
  }, [id, people, authHeaders, toast])

  if (!data) {
    return (
      <div className="subtab-content">
        <button type="button" className="link-btn" onClick={onBack}>← 뒤로</button>
        <div className="empty"><div className="spinner" /><div style={{ marginTop: 14 }}>불러오는 중…</div></div>
      </div>
    )
  }

  return (
    <div className="subtab-content">
      <div className="detail-header">
        <button type="button" className="back-btn" onClick={onBack}>←</button>
        <div className="title-block">
          <div className="dish-emoji">{firstEmoji(data)}</div>
          <div className="dish-name">{data.name}</div>
          {data.category && <div className="dish-cat">{data.category} · {mealType}</div>}
        </div>
      </div>

      <div className="subtabs mini" style={{ marginTop: 8 }}>
        <button type="button" className={`subtab ${view === 'ing' ? 'active' : ''}`} onClick={() => setView('ing')}>🥬 재료로 만들기</button>
        <button type="button" className={`subtab ${view === 'kit' ? 'active' : ''}`} onClick={() => setView('kit')}>🍱 밀키트</button>
      </div>

      {view === 'ing' && (
        <>
          <div className="ingredient-list" style={{ marginTop: 12 }}>
            {(data.ingredients || []).map((ing) => (
              <a key={ing.name} className="ingredient-row" href={ing.coupang_url} target="_blank" rel="noopener noreferrer">
                <span className="emoji">{ing.emoji || '🥬'}</span>
                <span className="info">
                  <span className="name">{ing.name}</span>
                  {ing.keyword && ing.keyword !== ing.name && <span className="amount">검색: {ing.keyword}</span>}
                </span>
                <span className="buy">쿠팡 ›</span>
              </a>
            ))}
          </div>
        </>
      )}

      {view === 'kit' && (
        <div style={{ marginTop: 12 }}>
          {data.milkit_url ? (
            <a className="ingredient-row" href={data.milkit_url} target="_blank" rel="noopener noreferrer">
              <span className="emoji">🍱</span>
              <span className="info">
                <span className="name">{data.milkit_keyword}</span>
                <span className="amount">쿠팡에서 밀키트 검색</span>
              </span>
              <span className="buy">쿠팡 ›</span>
            </a>
          ) : (
            <div className="empty">
              <div className="big-icon">🥬</div>
              <div className="title">이 메뉴는 밀키트가 없어요</div>
              <div>재료를 직접 사서 만들어보세요</div>
            </div>
          )}
        </div>
      )}

      {/* 가격 비교 분석 */}
      <div className="compare-block">
        <div className="compare-header">
          <div>
            <div className="compare-title">가격 비교</div>
            <div className="compare-sub">{people}인 가족 기준</div>
          </div>
          <button type="button" className="btn small tonal" onClick={runCompare} disabled={comparing}>
            {comparing ? '계산 중…' : compare ? '다시 계산' : '계산하기'}
          </button>
        </div>

        {compare && (
          <div className="compare-result">
            <div className="compare-row">
              <span className="lbl">🥬 재료 합계</span>
              <span className="val">{compare.ingredients_total > 0 ? `${compare.ingredients_total.toLocaleString()}원` : '—'}</span>
            </div>
            <div className="compare-row">
              <span className="lbl">🍱 밀키트</span>
              <span className="val">{compare.milkit ? `${compare.milkit.price.toLocaleString()}원` : '—'}</span>
            </div>
            {compare.recommendation && (
              <div className="compare-rec">{compare.recommendation}</div>
            )}
          </div>
        )}
      </div>

      <button type="button" className="btn block" style={{ marginTop: 14 }} onClick={onAte}>
        🍽️ 먹었어요 (기록)
      </button>
    </div>
  )
}

// ── 식단계획 ────────────────────────────────────────────────────────
const SLOTS = [
  { id: 'breakfast', label: '아침', mealType: '아침' },
  { id: 'lunch',     label: '점심', mealType: '점심' },
  { id: 'dinner',    label: '저녁', mealType: '저녁' },
]
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

function PlanTab() {
  const { authHeaders } = useAuth()
  const toast = useToast()
  const [weekStart, setWeekStart] = useState(() => getWeekStart())
  const [plan, setPlan] = useState(() => loadPlan(getWeekStart()))
  const [allMenus, setAllMenus] = useState(null)
  const [picker, setPicker] = useState(null) // { date, slot, mealType }
  const [showShop, setShowShop] = useState(false)

  useEffect(() => {
    fetch('/api/menu/list', { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => setAllMenus(d.items || []))
      .catch(() => toast('메뉴 카탈로그 로드 실패'))
  }, [authHeaders, toast])

  useEffect(() => { setPlan(loadPlan(weekStart)) }, [weekStart])

  const menuMap = useMemo(() => {
    const m = {}
    for (const x of allMenus || []) m[x.id] = x
    return m
  }, [allMenus])

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  }), [weekStart])

  const setSlot = (date, slot, menuId) => {
    setPlan((prev) => {
      const day = { ...(prev[date] || {}) }
      if (menuId == null) delete day[slot]
      else day[slot] = menuId
      const next = { ...prev, [date]: day }
      savePlan(weekStart, next)
      return next
    })
    setPicker(null)
  }

  const aggregateIngredients = useMemo(() => {
    const map = {}
    for (const d of days) {
      const slots = plan[dateKey(d)] || {}
      for (const k of Object.keys(slots)) {
        const id = slots[k]
        const menu = menuMap[id]
        for (const ing of (menu?.ingredients || [])) {
          const key = ing.keyword || ing.name
          if (!map[key]) map[key] = { name: ing.name, emoji: ing.emoji, keyword: key, count: 0, recipes: [] }
          map[key].count += 1
          if (!map[key].recipes.includes(menu.name)) map[key].recipes.push(menu.name)
        }
      }
    }
    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [plan, days, menuMap])

  const planned = useMemo(() => {
    let count = 0
    for (const d of days) {
      const slots = plan[dateKey(d)] || {}
      for (const s of SLOTS) if (slots[s.id]) count++
    }
    return count
  }, [plan, days])

  const shiftWeek = (delta) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + delta * 7)
    setWeekStart(d)
  }

  if (showShop) {
    return (
      <ShoppingList
        items={aggregateIngredients}
        onBack={() => setShowShop(false)}
      />
    )
  }

  if (picker) {
    return (
      <MenuPicker
        mealType={picker.mealType}
        menus={allMenus || []}
        onPick={(menuId) => setSlot(picker.date, picker.slot, menuId)}
        onClear={() => setSlot(picker.date, picker.slot, null)}
        onClose={() => setPicker(null)}
      />
    )
  }

  return (
    <div className="subtab-content">
      <div className="week-nav">
        <button type="button" onClick={() => shiftWeek(-1)}>‹</button>
        <span>{weekStart.getMonth() + 1}월 {weekStart.getDate()}일~ 주간</span>
        <button type="button" onClick={() => shiftWeek(1)}>›</button>
      </div>

      <div className="plan-grid">
        {days.map((d, i) => {
          const slots = plan[dateKey(d)] || {}
          const isToday = dateKey(d) === dateKey(new Date())
          return (
            <div key={dateKey(d)} className={`plan-day ${isToday ? 'today' : ''}`}>
              <div className="day-head">
                <span className="dow">{DAY_LABELS[i]}</span>
                <span className="dom">{d.getDate()}</span>
              </div>
              {SLOTS.map((s) => {
                const id = slots[s.id]
                const menu = id ? menuMap[id] : null
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`plan-slot ${menu ? 'filled' : ''}`}
                    onClick={() => setPicker({ date: dateKey(d), slot: s.id, mealType: s.mealType })}
                  >
                    <span className="slot-label">{s.label}</span>
                    {menu ? (
                      <span className="slot-menu">{firstEmoji(menu)} {menu.name}</span>
                    ) : (
                      <span className="slot-add">+ 추가</span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        className="btn block"
        style={{ marginTop: 14 }}
        disabled={planned === 0}
        onClick={() => setShowShop(true)}
      >
        🛒 이번주 필요한 재료 ({planned}끼 / {aggregateIngredients.length}종)
      </button>
    </div>
  )
}

function MenuPicker({ mealType, menus, onPick, onClear, onClose }) {
  const filtered = useMemo(
    () => menus.filter((m) => (m.meal_type || []).includes(mealType)),
    [menus, mealType],
  )
  return (
    <div className="subtab-content">
      <div className="detail-header">
        <button type="button" className="back-btn" onClick={onClose}>←</button>
        <div className="title-block">
          <div className="dish-name">{mealType} 메뉴 선택</div>
          <div className="dish-cat">{filtered.length}개</div>
        </div>
      </div>
      <div className="menu-grid" style={{ marginTop: 12 }}>
        <button type="button" className="menu-card" onClick={onClear}>
          <span className="emoji">⊘</span>
          <span className="name">비우기</span>
        </button>
        {filtered.map((m) => (
          <button key={m.id} type="button" className="menu-card" onClick={() => onPick(m.id)}>
            <span className="emoji">{firstEmoji(m)}</span>
            <span className="name">{m.name}</span>
            {m.category && <span className="cat">{m.category}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

function ShoppingList({ items, onBack }) {
  return (
    <div className="subtab-content">
      <div className="detail-header">
        <button type="button" className="back-btn" onClick={onBack}>←</button>
        <div className="title-block">
          <div className="dish-name">이번주 장보기</div>
          <div className="dish-cat">{items.length}종 · 카드 탭하면 쿠팡</div>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="empty"><div className="big-icon">🛒</div><div className="title">아직 식단이 없어요</div></div>
      ) : (
        <div className="ingredient-list" style={{ marginTop: 12 }}>
          {items.map((it) => (
            <a
              key={it.keyword}
              className="ingredient-row"
              href={coupangUrl(it.keyword)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="emoji">{it.emoji || '🥬'}</span>
              <span className="info">
                <span className="name">{it.name}</span>
                <span className="amount">{it.count}끼 · {it.recipes.join(', ')}</span>
              </span>
              <span className="buy">쿠팡 ›</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 오늘특가 / 공통 검색 결과 ────────────────────────────────────────
function DealsTab({ query, emptyHint }) {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      try {
        const r = await fetch(`/api/prices/compare?query=${encodeURIComponent(query)}`)
        if (!r.ok) throw new Error()
        const d = await r.json()
        if (!cancelled) setData(d)
      } catch {
        if (!cancelled) { setData({ items: [] }); toast('검색 실패') }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [query, toast])

  if (loading) return <div className="empty"><div className="spinner" /><div style={{ marginTop: 14 }}>불러오는 중…</div></div>
  const items = data?.items || []
  if (items.length === 0) {
    return (
      <div className="empty">
        <div className="big-icon">🛍️</div>
        <div className="title">{emptyHint || '결과가 없어요'}</div>
      </div>
    )
  }
  return (
    <div className="subtab-content">
      <div className="deal-grid">
        {items.slice(0, 12).map((it, idx) => {
          const total = it.price + (it.shipping ?? 0)
          return (
            <a key={`${it.productId || idx}-${it.mall}`} className="deal-card" href={it.link} target="_blank" rel="noopener noreferrer">
              <img src={it.image} alt="" loading="lazy" />
              <div className="title">{it.title}</div>
              <div className="meta">
                <span className="mall">{it.mall}</span>
                <span className="price">{total.toLocaleString()}원</span>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}

const INSTANT_QUERIES = [
  { id: 'mealkit', label: '밀키트',   query: '밀키트' },
  { id: 'simple',  label: '간편식',   query: '간편식' },
  { id: 'frozen',  label: '냉동식품', query: '냉동식품' },
]
function InstantTab() {
  const [pick, setPick] = useState('mealkit')
  const current = INSTANT_QUERIES.find((q) => q.id === pick)
  return (
    <div className="subtab-content">
      <div className="subtabs mini">
        {INSTANT_QUERIES.map((q) => (
          <button key={q.id} type="button" className={`subtab ${pick === q.id ? 'active' : ''}`} onClick={() => setPick(q.id)}>{q.label}</button>
        ))}
      </div>
      <DealsTab query={current.query} emptyHint={`${current.label} 결과가 없어요`} />
    </div>
  )
}
