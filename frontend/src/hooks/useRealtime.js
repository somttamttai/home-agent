import { useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './useAuth.jsx'

export function useRealtime(table, householdId, onchange) {
  useEffect(() => {
    if (!householdId || !onchange) return

    const channel = supabase
      .channel(`${table}-${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          onchange(payload)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, householdId, onchange])
}
