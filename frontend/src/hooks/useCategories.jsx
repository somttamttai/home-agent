import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth } from './useAuth.jsx'

const DEFAULT_CATEGORIES = [
  { key: '욕실',     icon: '🛁' },
  { key: '주방',     icon: '🍳' },
  { key: '세탁실',   icon: '🧺' },
  { key: '청소',     icon: '🧹' },
  { key: '침실',     icon: '🛏' },
  { key: '드레스룸', icon: '👔' },
  { key: '건강',     icon: '💊' },
  { key: '반려동물', icon: '🐾' },
  { key: '유아용품', icon: '🍼' },
  { key: '기타',     icon: '📦' },
]

const CategoriesContext = createContext(null)

export function CategoriesProvider({ children }) {
  const { authHeaders, household } = useAuth()
  const [custom, setCustom] = useState([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/categories', { headers: authHeaders() })
      if (!r.ok) return
      const data = await r.json()
      setCustom(data.custom || [])
    } catch {}
    setLoaded(true)
  }, [authHeaders])

  useEffect(() => { if (household) load() }, [household, load])

  const all = [...DEFAULT_CATEGORIES, ...custom]

  const getIcon = useCallback((key) => {
    const found = all.find((c) => c.key === key)
    return found?.icon || '📦'
  }, [all])

  const allKeys = all.map((c) => c.key)

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

  const value = {
    categories: all,
    categoryKeys: allKeys,
    customCategories: custom,
    defaultCategories: DEFAULT_CATEGORIES,
    getIcon,
    loaded,
    addCategory,
    updateCategory,
    deleteCategory,
    reload: load,
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
