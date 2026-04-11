import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast.jsx'
import { getPreferredBrand } from '../utils/brands.js'

// 소모품 목록 + 액션을 공유하는 훅. Home/CategoryDetail 양쪽에서 사용.
export function useConsumables() {
  const nav = useNavigate()
  const toast = useToast()
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

  const onStockChange = useCallback(async (item, nextStock) => {
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
  }, [toast, load])

  // 일반화된 PATCH 헬퍼 — 임의 필드를 한꺼번에 업데이트
  const onUpdate = useCallback(async (item, patch) => {
    // optimistic update
    setItems((list) =>
      list.map((i) => (i.id === item.id ? { ...i, ...patch } : i)),
    )
    try {
      const r = await fetch(`/api/consumables/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const updated = await r.json()
      setItems((list) => list.map((i) => (i.id === item.id ? updated : i)))
      return updated
    } catch (e) {
      toast(`❌ 저장 실패: ${e.message}`)
      load()
      throw e
    }
  }, [toast, load])

  const onDelete = useCallback(async (item) => {
    try {
      const r = await fetch(`/api/consumables/${item.id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setItems((list) => list.filter((i) => i.id !== item.id))
      toast(`🗑 "${item.name}" 삭제됨`)
    } catch (e) {
      toast(`❌ 삭제 실패: ${e.message}`)
    }
  }, [toast])

  const onRefresh = useCallback((item) => {
    // /compare 로 넘길 때:
    //   - query: 상품명 (bare)
    //   - brand: 사용자가 Settings 에서 등록한 선호 브랜드 (있으면)
    //   - ply: spec 에 "X겹" 있으면 추출
    const name = (item.name || '').trim()
    const preferred = getPreferredBrand(name)

    const params = new URLSearchParams({ query: name })
    if (preferred) params.set('brand', preferred)
    if (item.spec && /(\d)\s*겹/.test(item.spec)) {
      params.set('ply', item.spec.match(/(\d)\s*겹/)[1])
    }
    nav(`/compare?${params}`)
  }, [nav])

  return {
    items,
    loading,
    error,
    reload: load,
    onStockChange,
    onUpdate,
    onDelete,
    onRefresh,
  }
}
