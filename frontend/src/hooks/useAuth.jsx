import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [household, setHousehold] = useState(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s) fetchHousehold(s)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) fetchHousehold(s)
      else {
        setHousehold(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const authHeaders = useCallback(() => {
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  }, [session])

  const fetchHousehold = useCallback(async (s) => {
    try {
      const r = await fetch('/api/auth/household', {
        headers: { Authorization: `Bearer ${s.access_token}` },
      })
      if (!r.ok) throw new Error()
      const data = await r.json()
      setHousehold(data.household || null)
    } catch {
      setHousehold(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshHousehold = useCallback(async () => {
    if (session) await fetchHousehold(session)
  }, [session, fetchHousehold])

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }, [])

  const signInWithKakao = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: window.location.origin },
    })
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
    setHousehold(null)
  }, [])

  const value = {
    session,
    user: session?.user || null,
    household,
    householdId: household?.id || null,
    loading,
    authHeaders,
    signInWithGoogle,
    signInWithKakao,
    signOut,
    refreshHousehold,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
