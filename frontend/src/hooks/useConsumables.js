import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast.jsx'

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
    // 검색어 빌드 규칙:
    //   - spec 은 항상 제외 (네이버 검색 noise 제거)
    //   - brand 가 "기타" 거나 비어있으면 → 상품명만
    //   - 상품명에 brand 가 이미 포함되어 있으면 → 상품명만
    //   - 상품명이 2단어 이상이면 → 이미 브랜드 컨텍스트 포함 가능성 → 상품명만
    //   - 그 외 단일 단어 상품명 + 구체 브랜드 → "brand name"
    const name = (item.name || '').trim()
    const brand = (item.brand || '').trim()

    let query = name
    if (
      brand &&
      brand !== '기타' &&
      !name.includes(brand) &&
      name.split(/\s+/).length < 2
    ) {
      query = `${brand} ${name}`
    }

    const params = new URLSearchParams({ query })
    // 휴지/화장지 류는 spec 의 겹수만 ply 필터로 전달
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
    onDelete,
    onRefresh,
  }
}
