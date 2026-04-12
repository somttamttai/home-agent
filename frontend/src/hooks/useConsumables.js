import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast.jsx'
import { useAuth } from './useAuth.jsx'
import { useRealtime } from './useRealtime.js'

export function useConsumables() {
  const nav = useNavigate()
  const toast = useToast()
  const { authHeaders, householdId } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [brands, setBrands] = useState({})

  const hdrs = useCallback(() => ({
    'Content-Type': 'application/json',
    ...authHeaders(),
  }), [authHeaders])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/consumables', { headers: authHeaders() })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setItems(await r.json())
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [authHeaders])

  const loadBrands = useCallback(async () => {
    try {
      const r = await fetch('/api/brands', { headers: authHeaders() })
      if (!r.ok) return
      const data = await r.json()
      setBrands(data.brands || {})
    } catch {}
  }, [authHeaders])

  useEffect(() => { load(); loadBrands() }, [load, loadBrands])

  useRealtime('consumables', householdId, useCallback(() => {
    load()
  }, [load]))

  const onStockChange = useCallback(async (item, nextStock) => {
    setItems((list) =>
      list.map((i) => (i.id === item.id ? { ...i, current_stock: nextStock } : i)),
    )
    try {
      const r = await fetch(`/api/consumables/${item.id}`, {
        method: 'PATCH',
        headers: hdrs(),
        body: JSON.stringify({ current_stock: nextStock }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const updated = await r.json()
      setItems((list) => list.map((i) => (i.id === item.id ? updated : i)))
    } catch (e) {
      toast(`❌ 저장 실패: ${e.message}`)
      load()
    }
  }, [toast, load, hdrs])

  const onUpdate = useCallback(async (item, patch) => {
    setItems((list) =>
      list.map((i) => (i.id === item.id ? { ...i, ...patch } : i)),
    )
    try {
      const r = await fetch(`/api/consumables/${item.id}`, {
        method: 'PATCH',
        headers: hdrs(),
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
  }, [toast, load, hdrs])

  const onDelete = useCallback(async (item) => {
    try {
      const r = await fetch(`/api/consumables/${item.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setItems((list) => list.filter((i) => i.id !== item.id))
      toast(`🗑 "${item.name}" 삭제됨`)
    } catch (e) {
      toast(`❌ 삭제 실패: ${e.message}`)
    }
  }, [toast, authHeaders])

  const getPreferredBrand = useCallback((name) => {
    if (!name) return null
    return brands[name.trim()] || null
  }, [brands])

  const onRefresh = useCallback((item) => {
    const name = (item.name || '').trim()
    const preferred = getPreferredBrand(name)

    const params = new URLSearchParams({ query: name })
    if (preferred) params.set('brand', preferred)
    if (item.spec && /(\d)\s*겹/.test(item.spec)) {
      params.set('ply', item.spec.match(/(\d)\s*겹/)[1])
    }
    nav(`/compare?${params}`)
  }, [nav, getPreferredBrand])

  return {
    items,
    loading,
    error,
    reload: load,
    onStockChange,
    onUpdate,
    onDelete,
    onRefresh,
    brands,
    getPreferredBrand,
  }
}
