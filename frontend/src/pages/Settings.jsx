import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { useToast } from '../components/Toast.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import { useCategories } from '../hooks/useCategories.jsx'
import { effectivePeople, formatPeople } from '../utils/family.js'
import { expectedDays } from '../utils/consumption.js'

function Counter({ label, hint, value, onChange, min = 0, max = 99 }) {
  return (
    <div className="counter-row">
      <div className="counter-label">
        <div className="title">{label}</div>
        {hint && <div className="hint">{hint}</div>}
      </div>
      <div className="counter-controls">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`${label} 감소`}
        >
          −
        </button>
        <span className="value">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`${label} 증가`}
        >
          ＋
        </button>
      </div>
    </div>
  )
}

export default function Settings() {
  const toast = useToast()
  const nav = useNavigate()
  const { authHeaders, household, user, signOut } = useAuth()
  const { refreshFamily } = useCategories()
  const [form, setForm] = useState({ adults: 2, children: 0, infants: 0, pets: 0 })
  const [initial, setInitial] = useState({ adults: 2, children: 0, infants: 0, pets: 0 })
  const [loaded, setLoaded] = useState(false)

  const loadSettings = useCallback(async () => {
    try {
      const r = await fetch('/api/family', { headers: authHeaders() })
      if (!r.ok) return
      const data = await r.json()
      const f = {
        adults: data.adults ?? 2,
        children: data.children ?? 0,
        infants: data.infants ?? 0,
        pets: data.pets ?? 0,
      }
      setForm(f)
      setInitial(f)
    } catch {}
    setLoaded(true)
  }, [authHeaders])

  useEffect(() => { loadSettings() }, [loadSettings])

  const setAdults = (n) => setForm((f) => ({ ...f, adults: n }))
  const setChildren = (n) => setForm((f) => ({ ...f, children: n }))
  const setInfants = (n) => setForm((f) => ({ ...f, infants: n }))
  const setPets = (n) => setForm((f) => ({ ...f, pets: n }))

  const onSave = async () => {
    try {
      const r = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(form),
      })
      if (!r.ok) throw new Error()
      setInitial({ ...form })
      await refreshFamily()
      toast('설정이 저장됐어요 ✅')
    } catch {
      toast('❌ 저장에 실패했어요')
    }
  }

  const onReset = () => setForm({ ...initial })

  const family = { adults: form.adults, children: form.children }
  const people = effectivePeople(family)
  const isDirty =
    form.adults !== initial.adults ||
    form.children !== initial.children ||
    form.infants !== initial.infants ||
    form.pets !== initial.pets

  return (
    <div className="page-enter">
      <PageHeader title="설정" />
      <div className="page">
        {/* 집 정보 */}
        <div className="section-title" style={{ paddingTop: 0 }}>
          우리집
        </div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>
                🏠 {household?.name || '우리집'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 4 }}>
                {user?.email}
              </div>
            </div>
            <button
              type="button"
              className="btn tonal"
              style={{ fontSize: 12 }}
              onClick={() => nav('/invite')}
            >
              초대코드
            </button>
          </div>
        </div>

        {/* 가족 구성원 */}
        <div className="section-title">가족 구성원</div>

        <Counter
          label="성인"
          hint="13세 이상"
          value={form.adults}
          onChange={setAdults}
        />
        <Counter
          label="어린이"
          hint="12세 이하 · 성인의 0.7배 가중치"
          value={form.children}
          onChange={setChildren}
        />
        <Counter
          label="영유아"
          hint="3세 이하"
          value={form.infants}
          onChange={setInfants}
        />
        <Counter
          label="🐾 반려동물"
          hint="마리 수"
          value={form.pets}
          onChange={setPets}
        />

        <div
          className="card"
          style={{ borderColor: 'var(--primary)', borderWidth: 1.5 }}
        >
          <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>
            유효 인원
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: 'var(--primary)',
              letterSpacing: '-0.03em',
              marginTop: 4,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}
          >
            {formatPeople(people)}
            <span style={{ fontSize: 18, marginLeft: 2 }}>인</span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-sub)',
              marginTop: 8,
              fontWeight: 500,
            }}
          >
            성인 {form.adults}명 + 어린이 {form.children}명 x 0.7
          </div>

          {people > 0 && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-sub)',
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                예상 소비 일수
              </div>
              {[
                ['화장지 30롤', '화장지'],
                ['치약 120g', '치약'],
                ['키친타올 150매', '키친타올'],
                ['세탁세제 3kg', '세탁세제'],
              ].map(([label, key]) => (
                <div
                  key={key}
                  style={{
                    fontSize: 13,
                    color: 'var(--text)',
                    marginTop: 6,
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{label}</span>
                  <span
                    style={{
                      fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--primary)',
                    }}
                  >
                    약 {expectedDays(key, family)}일
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {isDirty && (
          <button
            type="button"
            className="btn secondary block"
            style={{ marginTop: 12 }}
            onClick={onReset}
          >
            되돌리기
          </button>
        )}

        <div className="section-title" style={{ marginTop: 24 }}>안내</div>
        <div className="card">
          <div style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.6 }}>
            가족 인원을 설정하면 소모품 추가 시 일일 소비량이 자동으로 계산돼요.
            템플릿을 선택하면 기준 소비속도에 우리 가족 인원을 곱한 값이 들어갑니다.
          </div>
        </div>

        <button
          type="button"
          className="btn secondary block"
          onClick={signOut}
          style={{ marginTop: 24, color: 'var(--danger)' }}
        >
          로그아웃
        </button>
      </div>

      <div className="bottom-action">
        <button type="button" className="btn block lg" onClick={onSave}>
          저장하기
        </button>
      </div>
    </div>
  )
}
