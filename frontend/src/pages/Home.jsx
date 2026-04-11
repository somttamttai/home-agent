import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import StockCard from '../components/StockCard.jsx'
import { useToast } from '../components/Toast.jsx'

export default function Home() {
  const nav = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const toast = useToast()

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
      list.map((i) => (i.id === item.id ? { ...i, current_stock: nextStock } : i))
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

  if (loading) return <div className="empty">불러오는 중…</div>
  if (error) return (
    <div className="empty">
      서버 연결 실패<br />
      <small>{error}</small><br />
      <button className="btn secondary" onClick={load} style={{ marginTop: 12 }}>
        다시 시도
      </button>
    </div>
  )
  if (items.length === 0) return (
    <div className="empty">
      등록된 소모품이 없어요.<br />
      <small>Supabase consumables 테이블에 먼저 추가해주세요.</small>
    </div>
  )

  const low = items.filter((i) => i.need_reorder)

  return (
    <div>
      {low.length > 0 && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#ef4444' }}>
          <b style={{ color: '#b91c1c' }}>⚠️ {low.length}개 품목 재고 부족</b>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            {low.map((i) => i.name).join(', ')}
          </div>
        </div>
      )}
      {items.map((it) => (
        <StockCard
          key={it.id}
          item={it}
          onRefresh={onRefresh}
          onStockChange={onStockChange}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
