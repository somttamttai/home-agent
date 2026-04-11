import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StockCard from '../components/StockCard.jsx'
import { useToast } from '../components/Toast.jsx'
import { useTheme } from '../hooks/useTheme.js'

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '좋은 새벽이에요'
  if (h < 12) return '좋은 아침이에요'
  if (h < 18) return '좋은 오후에요'
  return '좋은 저녁이에요'
}

export default function Home() {
  const nav = useNavigate()
  const toast = useToast()
  const { theme, toggle } = useTheme()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/consumables')
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setItems(await r.json())
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    const low = items.filter((i) => i.need_reorder)
    if (low.length === 0) return
    if ('Notification' in window && Notification.permission === 'granted') {
      const names = low.map((i) => i.name).join(', ')
      try {
        new Notification('⚠️ 재고 부족', {
          body: `${low.length}개 품목 주문 필요: ${names}`,
          tag: 'home-agent-low-stock',
        })
      } catch {}
    }
  }, [items])

  const onRefresh = (item) => {
    const q = [item.name, item.spec].filter(Boolean).join(' ')
    const params = new URLSearchParams({ query: q })
    if (item.spec && /(\d)\s*겹/.test(item.spec)) {
      params.set('ply', item.spec.match(/(\d)\s*겹/)[1])
    }
    nav(`/compare?${params}`)
  }

  const onStockChange = async (item, nextStock) => {
    setItems((list) =>
      list.map((i) => (i.id === item.id ? { ...i, current_stock: nextStock } : i)),
    )
    try {
      const r = await fetch(`/api/consumables/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_stock: nextStock }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const updated = await r.json()
      setItems((list) => list.map((i) => (i.id === item.id ? updated : i)))
    } catch (e) {
      toast(`❌ 저장 실패: ${e.message}`)
      load()
    }
  }

  const onDelete = async (item) => {
    try {
      const r = await fetch(`/api/consumables/${item.id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setItems((list) => list.filter((i) => i.id !== item.id))
      toast(`🗑 "${item.name}" 삭제됨`)
    } catch (e) {
      toast(`❌ 삭제 실패: ${e.message}`)
    }
  }

  const low = items.filter((i) => i.need_reorder)
  const hasDailyUsage = items.filter((i) => i.days_left != null)
  const avgDaysLeft =
    hasDailyUsage.length > 0
      ? Math.round(
          hasDailyUsage.reduce((s, i) => s + i.days_left, 0) / hasDailyUsage.length,
        )
      : null

  const themeIcon = theme === 'dark' ? '☀️' : '🌙'

  return (
    <div>
      <div className="home-header">
        <div className="greet-wrap">
          <div className="greet">{greeting()} 👋</div>
          <div className="sub">오늘도 집안 관리 깔끔하게</div>
        </div>
        <button
          type="button"
          className="theme-toggle"
          onClick={toggle}
          aria-label="테마 전환"
        >
          {themeIcon}
        </button>
      </div>

      <div className="page">
        {loading && <div className="empty">불러오는 중…</div>}

        {!loading && error && (
          <div className="empty">
            <div className="big-icon">⚠️</div>
            <div className="title">서버 연결 실패</div>
            <div style={{ marginBottom: 16 }}>{error}</div>
            <button className="btn tonal" onClick={load}>다시 시도</button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="empty">
            <div className="big-icon">📦</div>
            <div className="title">아직 등록된 소모품이 없어요</div>
            <div style={{ marginBottom: 20 }}>하단 ＋ 버튼으로 첫 품목을 추가해보세요</div>
            <button className="btn" onClick={() => nav('/add')}>
              ＋ 소모품 추가하기
            </button>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <div className="summary-card">
              <div className="label">관리 중인 소모품</div>
              <div className="big">
                {items.length}<span className="unit">개</span>
              </div>
              <div className="detail">
                {low.length > 0
                  ? `${low.length}개 품목 주문이 필요해요`
                  : avgDaysLeft != null
                    ? `평균 ${avgDaysLeft}일치 여유있어요`
                    : '모두 여유있어요 ✨'}
              </div>
            </div>

            {low.length > 0 && (
              <div className="warning-strip">
                <span className="icon">⚠️</span>
                <div className="text">
                  재주문 필요 {low.length}개
                  <small>{low.map((i) => i.name).join(', ')}</small>
                </div>
              </div>
            )}

            <div className="section-title">내 소모품</div>
            {items.map((it) => (
              <StockCard
                key={it.id}
                item={it}
                onRefresh={onRefresh}
                onStockChange={onStockChange}
                onDelete={onDelete}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
