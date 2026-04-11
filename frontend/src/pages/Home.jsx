import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme.js'
import { useConsumables } from '../hooks/useConsumables.js'

const CATEGORIES = ['욕실', '주방', '세탁실', '청소', '침실', '드레스룸', '기타']
const CAT_ICON = {
  욕실: '🛁',
  주방: '🍳',
  세탁실: '🧺',
  청소: '🧹',
  침실: '🛏',
  드레스룸: '👔',
  기타: '📦',
}

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '좋은 새벽이에요'
  if (h < 12) return '좋은 아침이에요'
  if (h < 18) return '좋은 오후에요'
  return '좋은 저녁이에요'
}

function ddayClass(daysLeft) {
  if (daysLeft == null) return 'safe'
  if (daysLeft <= 3) return 'urgent'
  if (daysLeft <= 7) return 'warning'
  return 'safe'
}

function formatDday(daysLeft) {
  if (daysLeft == null) return '?'
  if (daysLeft < 1) return 'D-DAY'
  return `D-${Math.floor(daysLeft)}`
}

export default function Home() {
  const nav = useNavigate()
  const { theme, toggle } = useTheme()
  const { items, loading, error, reload, onRefresh } = useConsumables()

  // 알림 권한
  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const low = useMemo(() => items.filter((i) => i.need_reorder), [items])

  // 부족 품목 푸시알림
  useEffect(() => {
    if (low.length === 0) return
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('⚠️ 재고 부족', {
          body: `${low.length}개 품목 주문 필요: ${low.map((i) => i.name).join(', ')}`,
          tag: 'home-agent-low-stock',
        })
      } catch {}
    }
  }, [low])

  // 카테고리별 카운트
  const counts = useMemo(() => {
    const c = {}
    for (const cat of CATEGORIES) c[cat] = { total: 0, low: 0 }
    for (const it of items) {
      const cat = it.category || '기타'
      if (!c[cat]) c[cat] = { total: 0, low: 0 }
      c[cat].total += 1
      if (it.need_reorder) c[cat].low += 1
    }
    return c
  }, [items])

  const visibleCategories = useMemo(
    () => CATEGORIES.filter((c) => counts[c].total > 0),
    [counts],
  )

  const themeIcon = theme === 'dark' ? '☀️' : '🌙'
  const safe = items.length - low.length

  return (
    <div>
      <div className="home-header">
        <div className="greet-wrap">
          <div className="greet">{greeting()} 👋</div>
          <div className="sub">
            {loading
              ? '\u00A0'
              : low.length > 0
                ? `오늘 신경쓸 게 ${low.length}개예요`
                : '모든 재고가 여유로워요 ✅'}
          </div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggle}
            aria-label="테마 전환"
          >
            {themeIcon}
          </button>
          <button
            type="button"
            className="theme-toggle"
            onClick={() => nav('/settings')}
            aria-label="설정"
          >
            ⚙️
          </button>
        </div>
      </div>

      <div className="page">
        {loading && <div className="empty">불러오는 중…</div>}

        {!loading && error && (
          <div className="empty">
            <div className="big-icon">⚠️</div>
            <div className="title">서버 연결 실패</div>
            <div style={{ marginBottom: 16 }}>{error}</div>
            <button className="btn tonal" onClick={reload}>다시 시도</button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="empty">
            <div className="big-icon">📦</div>
            <div className="title">아직 등록된 소모품이 없어요</div>
            <div style={{ marginBottom: 20 }}>
              하단 ＋ 버튼으로 첫 품목을 추가해보세요
            </div>
            <button className="btn" onClick={() => nav('/add')}>
              ＋ 소모품 추가하기
            </button>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            {/* 1. 지금 필요해요 (재주문 필요한 품목만) */}
            {low.length > 0 && (
              <>
                <div className="section-title" style={{ paddingTop: 0 }}>
                  ⚠️ 지금 필요해요
                </div>
                <div className="urgent-card">
                  {low.map((it) => {
                    const emoji = CAT_ICON[it.category || '기타']
                    const cls = ddayClass(it.days_left)
                    return (
                      <button
                        key={it.id}
                        type="button"
                        className="urgent-row"
                        onClick={() => onRefresh(it)}
                      >
                        <span className="emoji">{emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="name">{it.name}</div>
                          {(it.brand || it.spec) && (
                            <div className="meta">
                              {[it.brand, it.spec].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </div>
                        <span className={`dday-badge ${cls}`}>
                          {formatDday(it.days_left)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {/* 2. 전체 현황 카드 */}
            <div
              className="section-title"
              style={low.length > 0 ? {} : { paddingTop: 0 }}
            >
              전체 현황
            </div>
            <div className="summary-card">
              <div className="label">관리 중인 소모품</div>
              <div className="big">
                {items.length}<span className="unit">개</span>
              </div>
              <div className="summary-breakdown">
                <span className="stat">
                  ✓ 여유 <strong>{safe}</strong>개
                </span>
                <span className="stat">
                  ⚠️ 부족 <strong>{low.length}</strong>개
                </span>
              </div>
            </div>

            {/* 3. 카테고리 그리드 */}
            <div className="section-title">카테고리</div>
            <div className="category-grid">
              {visibleCategories.map((cat) => {
                const c = counts[cat]
                const hasLow = c.low > 0
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`category-grid-card ${hasLow ? 'has-low' : ''}`}
                    onClick={() => nav(`/category/${encodeURIComponent(cat)}`)}
                  >
                    <div className="icon">{CAT_ICON[cat]}</div>
                    <div className="name">{cat}</div>
                    <div className="total">
                      {c.total}<span className="unit">개</span>
                    </div>
                    <div className="breakdown">
                      여유 {c.total - c.low} · 부족 {c.low}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
