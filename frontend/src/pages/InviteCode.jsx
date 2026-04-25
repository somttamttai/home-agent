import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import { useToast } from '../components/Toast.jsx'

export default function InviteCode() {
  const { authHeaders } = useAuth()
  const toast = useToast()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/invite-code', {
        headers: authHeaders(),
      })
      if (!r.ok) throw new Error()
      const data = await r.json()
      setCode(data.invite_code || '')
    } catch {
      toast('❌ 초대코드를 불러오지 못했어요')
    } finally {
      setLoading(false)
    }
  }, [authHeaders, toast])

  useEffect(() => { load() }, [load])

  const formatted = code ? `HOME-${code}` : '...'

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted)
      toast('복사됐어요 📋')
    } catch {
      toast('❌ 복사에 실패했어요')
    }
  }

  const onShareKakao = () => {
    if (typeof window !== 'undefined' && window.Kakao?.Share) {
      window.Kakao.Share.sendDefault({
        objectType: 'text',
        text: `home-agent에 참가하세요! 초대코드: ${formatted}`,
        link: {
          mobileWebUrl: window.location.origin,
          webUrl: window.location.origin,
        },
      })
    } else {
      const text = `home-agent에 참가하세요! 초대코드: ${formatted}`
      if (navigator.share) {
        navigator.share({ text }).catch(() => {})
      } else {
        onCopy()
      }
    }
  }

  return (
    <div className="page-enter">
      <PageHeader title="초대코드" />
      <div className="page">
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 12 }}>
            가족에게 이 코드를 공유하세요
          </div>
          <div className="invite-code-display">
            {loading ? '...' : formatted}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'center' }}>
            <button type="button" className="btn" onClick={onCopy} disabled={loading}>
              📋 복사하기
            </button>
            <button type="button" className="btn tonal" onClick={onShareKakao} disabled={loading}>
              💬 공유하기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
