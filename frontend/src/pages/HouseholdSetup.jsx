import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { useToast } from '../components/Toast.jsx'

export default function HouseholdSetup() {
  const { authHeaders, refreshHousehold, signOut } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('create')
  const [name, setName] = useState('우리집')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const onCreate = async () => {
    if (busy) return
    setBusy(true)
    try {
      const r = await fetch('/api/auth/household', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name: name.trim() || '우리집' }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.detail || '집 생성에 실패했어요')
      }
      toast('집이 만들어졌어요! 🏠')
      await refreshHousehold()
    } catch (e) {
      toast(`❌ ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  const onJoin = async () => {
    if (busy) return
    const cleaned = code.trim().toUpperCase().replace(/^HOME-/, '')
    if (cleaned.length !== 6) {
      toast('❌ 6자리 초대코드를 입력해주세요')
      return
    }
    setBusy(true)
    try {
      const r = await fetch('/api/auth/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ code: cleaned }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.detail || '참가에 실패했어요')
      }
      toast('집에 참가했어요! 🎉')
      await refreshHousehold()
    } catch (e) {
      toast(`❌ ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-content" style={{ maxWidth: 400 }}>
        <div className="login-logo">🏠</div>
        <h1 className="login-title" style={{ fontSize: 22 }}>우리집 설정</h1>
        <p className="login-subtitle">새 집을 만들거나 초대코드로 참가하세요</p>

        <div className="setup-tabs">
          <button
            type="button"
            className={`setup-tab ${tab === 'create' ? 'active' : ''}`}
            onClick={() => setTab('create')}
          >
            새 집 만들기
          </button>
          <button
            type="button"
            className={`setup-tab ${tab === 'join' ? 'active' : ''}`}
            onClick={() => setTab('join')}
          >
            초대코드 입력
          </button>
        </div>

        {tab === 'create' && (
          <div className="setup-form">
            <label className="setup-label">집 이름</label>
            <input
              type="text"
              className="setup-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="우리집"
              maxLength={20}
            />
            <button
              type="button"
              className="btn block lg"
              onClick={onCreate}
              disabled={busy}
              style={{ marginTop: 16 }}
            >
              {busy ? '만드는 중...' : '🏠 집 만들기'}
            </button>
          </div>
        )}

        {tab === 'join' && (
          <div className="setup-form">
            <label className="setup-label">초대코드</label>
            <input
              type="text"
              className="setup-input invite-code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="HOME-A3K9X2"
              maxLength={11}
              style={{ textAlign: 'center', letterSpacing: '0.15em', fontWeight: 700 }}
            />
            <button
              type="button"
              className="btn block lg"
              onClick={onJoin}
              disabled={busy}
              style={{ marginTop: 16 }}
            >
              {busy ? '참가 중...' : '🤝 참가하기'}
            </button>
          </div>
        )}

        <button
          type="button"
          className="btn secondary block"
          onClick={signOut}
          style={{ marginTop: 24 }}
        >
          로그아웃
        </button>
      </div>
    </div>
  )
}
