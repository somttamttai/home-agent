import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth.jsx'

export function useNotifications() {
  const { authHeaders } = useAuth()
  const [notifications, setNotifications] = useState([])

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications', { headers: authHeaders() })
      if (!r.ok) return
      setNotifications(await r.json())
    } catch {}
  }, [authHeaders])

  useEffect(() => { load() }, [load])

  const markRead = useCallback(async (id) => {
    setNotifications((list) => list.filter((n) => n.id !== id))
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
      })
    } catch {}
  }, [authHeaders])

  return { notifications, reload: load, markRead }
}
