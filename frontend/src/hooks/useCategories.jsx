import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './useAuth.jsx'
import { ITEMS_BY_CATEGORY } from '../utils/onboardingData.js'

const BASE_CATEGORIES = [
  { key: '욕실',     icon: '🛁' },
  { key: '주방',     icon: '🍳' },
  { key: '세탁실',   icon: '🧺' },
  { key: '청소',     icon: '🧹' },
  { key: '침실',     icon: '🛏' },
  { key: '드레스룸', icon: '👔' },
  { key: '건강',     icon: '💊' },
]

const CONDITIONAL_CATEGORIES = [
  { key: '반려동물', icon: '🐾', condition: 'pets' },
  { key: '유아용품', icon: '🍼', condition: 'infants' },
]

const CategoriesContext = createContext(null)

export function CategoriesProvider({ children }) {
  const { authHeaders, household } = useAuth()
  const [custom, setCustom] = useState([])
  const [family, setFamily] = useState({ adults: 2, children: 0, infants: 0, pets: 0 })
  const [loaded, setLoaded] = useState(false)

  const loadAll = useCallback(async () => {
    try {
      const [catRes, famRes] = await Promise.all([
        fetch('/api/categories', { headers: authHeaders() }),
        fetch('/api/family', { headers: authHeaders() }),
      ])
      if (catRes.ok) {
        const d = await catRes.json()
        setCustom(d.custom || [])
      }
      if (famRes.ok) {
        const d = await famRes.json()
        setFamily({
          adults: d.adults ?? 2,
          children: d.children ?? 0,
          infants: d.infants ?? 0,
          pets: d.pets ?? 0,
        })
      }
    } catch {}
    setLoaded(true)
  }, [authHeaders])

  useEffect(() => { if (household) loadAll() }, [household, loadAll])

  const autoCategories = useMemo(
    () => CONDITIONAL_CATEGORIES.filter((c) => (family[c.condition] || 0) > 0),
    [family],
  )

  const all = useMemo(
    () => [...BASE_CATEGORIES, ...autoCategories, { key: '기타', icon: '📦' }, ...custom],
    [autoCategories, custom],
  )

  const getIcon = useCallback((key) => {
    const found = all.find((c) => c.key === key)
    return found?.icon || '📦'
  }, [all])

  const categoryKeys = useMemo(() => all.map((c) => c.key), [all])

  const templateGroups = useMemo(() => {
    const groups = []
    for (const cat of all) {
      const items = ITEMS_BY_CATEGORY[cat.key]
      if (!items || items.length === 0) continue
      groups.push({
        category: cat.key,
        icon: cat.icon,
        templates: items.map((it) => ({
          icon: it.icon || cat.icon,
          name: it.name,
          brand: it.brand || '',
          spec: it.spec || '',
          daily_usage: it.baselineDays > 0 ? 0.03 : 0.01,
          reorder_point: 7,
        })),
      })
    }
    return groups
  }, [all])

  const addCategory = useCallback(async (name, icon) => {
    const r = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name, icon }),
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      throw new Error(err.detail || '추가 실패')
    }
    const data = await r.json()
    setCustom(data.custom || [])
  }, [authHeaders])

  const updateCategory = useCallback(async (oldName, name, icon) => {
    const r = await fetch('/api/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ old_name: oldName, name, icon }),
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      throw new Error(err.detail || '수정 실패')
    }
    const data = await r.json()
    setCustom(data.custom || [])
  }, [authHeaders])

  const deleteCategory = useCallback(async (name) => {
    const r = await fetch('/api/categories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name }),
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({}))
      throw new Error(err.detail || '삭제 실패')
    }
    const data = await r.json()
    setCustom(data.custom || [])
  }, [authHeaders])

  const refreshFamily = useCallback(async () => {
    try {
      const r = await fetch('/api/family', { headers: authHeaders() })
      if (!r.ok) return
      const d = await r.json()
      setFamily({
        adults: d.adults ?? 2, children: d.children ?? 0,
        infants: d.infants ?? 0, pets: d.pets ?? 0,
      })
    } catch {}
  }, [authHeaders])

  const value = {
    categories: all,
    categoryKeys,
    customCategories: custom,
    templateGroups,
    family,
    getIcon,
    loaded,
    addCategory,
    updateCategory,
    deleteCategory,
    refreshFamily,
    reload: loadAll,
  }

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  )
}

export function useCategories() {
  const ctx = useContext(CategoriesContext)
  if (!ctx) throw new Error('useCategories must be used within CategoriesProvider')
  return ctx
}
