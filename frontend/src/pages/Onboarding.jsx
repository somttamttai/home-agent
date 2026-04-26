import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { useToast } from '../components/Toast.jsx'
import { effectivePeople } from '../utils/family.js'
import { ALL_CATEGORIES, ITEMS_BY_CATEGORY } from '../utils/onboardingData.js'
import { SENSE_LEVELS, senseToStock } from '../utils/stockMode.js'

const TIPS = [
  '재고가 부족하면 자동으로 알려드려요',
  '가격비교로 최저가를 찾아드려요',
  '가족이 수정하면 실시간으로 반영돼요',
  '재고 상태는 언제든 탭으로 수정 가능해요',
  '구매하면 재고가 자동으로 업데이트돼요',
  '선호 브랜드를 설정하면 맞춤 비교해드려요',
  '소비 속도는 가족 수에 맞게 자동 계산돼요',
  '초대코드로 가족과 함께 관리할 수 있어요',
]

// ── 상단 브레드크럼 + 진행바 ─────────────────────────────────
function StepNav({ step, doneStep, categories }) {
  const pct = doneStep > 0 ? Math.min(100, Math.round((step / doneStep) * 100)) : 0

  const crumbs = useMemo(() => {
    const list = [
      { label: '가족', stepIdx: 0 },
      { label: '카테고리', stepIdx: 1 },
    ]
    categories.forEach((cat, i) => {
      const info = ALL_CATEGORIES.find((c) => c.key === cat)
      list.push({ label: `${info?.icon || ''} ${cat}`, stepIdx: 2 + i * 2 })
    })
    list.push({ label: '완료', stepIdx: doneStep })
    return list
  }, [categories, doneStep])

  const scrollRef = useRef(null)
  const activeRef = useRef(null)

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
    }
  }, [step])

  const currentCrumbIdx = useMemo(() => {
    for (let i = crumbs.length - 1; i >= 0; i--) {
      if (step >= crumbs[i].stepIdx) return i
    }
    return 0
  }, [step, crumbs])

  return (
    <div className="ob-nav">
      <div className="ob-crumbs" ref={scrollRef}>
        {crumbs.map((c, i) => {
          const isDone = i < currentCrumbIdx
          const isActive = i === currentCrumbIdx
          return (
            <span key={i} className="ob-crumb-wrap">
              {i > 0 && <span className="ob-crumb-sep">›</span>}
              <span ref={isActive ? activeRef : null}
                className={`ob-crumb ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                {isDone && <span className="check">✓</span>}
                {c.label}
              </span>
            </span>
          )
        })}
      </div>
      <div className="ob-progress-bar">
        <div className="ob-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── 로딩 화면 ────────────────────────────────────────────────
function LoadingScreen({ total, current, currentName }) {
  const [tipIdx, setTipIdx] = useState(0)
  const [tipVisible, setTipVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setTipVisible(false)
      setTimeout(() => {
        setTipIdx((i) => (i + 1) % TIPS.length)
        setTipVisible(true)
      }, 300)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const pct = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="ob-loading">
      <div className="ob-loading-top">소모품을 등록하고 있어요...</div>
      <div className="ob-loading-center">
        <div className="ob-loading-gauge">
          <div className="ob-loading-gauge-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="ob-loading-count">{current} / {total}개 등록 중</div>
        {currentName && <div className="ob-loading-name">{currentName}</div>}
      </div>
      <div className="ob-loading-bottom">
        <div className={`ob-loading-tip ${tipVisible ? 'visible' : ''}`}>
          💡 {TIPS[tipIdx]}
        </div>
      </div>
    </div>
  )
}

function Counter({ label, hint, value, onChange, min = 0 }) {
  return (
    <div className="counter-row">
      <div className="counter-label">
        <div className="title">{label}</div>
        {hint && <div className="hint">{hint}</div>}
      </div>
      <div className="counter-controls">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <span className="value">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)}>＋</button>
      </div>
    </div>
  )
}

// ── 가족 구성원 ──────────────────────────────────────────────
function StepFamily({ family, setFamily }) {
  return (
    <div className="ob-step">
      <div className="ob-brand-intro">
        <img className="ob-brand-logo" src="/logo.png" alt="솜솜" width="80" height="80" />
        <div className="ob-brand-name">솜솜</div>
        <div className="ob-brand-tagline">솜처럼 포근하게 우리집을 챙겨드려요</div>
      </div>
      <div className="ob-title">몇 명이 함께 사세요?</div>
      <Counter label="성인" hint="13세 이상" value={family.adults}
        onChange={(n) => setFamily((f) => ({ ...f, adults: n }))} min={1} />
      <Counter label="어린이" hint="4~12세" value={family.children}
        onChange={(n) => setFamily((f) => ({ ...f, children: n }))} />
      <Counter label="유아" hint="0~3세" value={family.infants}
        onChange={(n) => setFamily((f) => ({ ...f, infants: n }))} />
      <Counter label="🐾 반려동물" hint="마리 수" value={family.pets}
        onChange={(n) => setFamily((f) => ({ ...f, pets: n }))} />
      {family.infants > 0 && (
        <div className="ob-hint-card">유아용품 카테고리가 자동 추가돼요</div>
      )}
      {family.pets > 0 && (
        <div className="ob-hint-card">반려동물 카테고리가 자동 추가돼요</div>
      )}
    </div>
  )
}

// ── 카테고리 선택 ────────────────────────────────────────────
function StepCategories({ selected, setSelected, family }) {
  const autoSuggest = useMemo(() => {
    const suggest = {}
    for (const cat of ALL_CATEGORIES) {
      if (cat.auto === 'infants' && family.infants > 0) suggest[cat.key] = true
      if (cat.auto === 'pets' && family.pets > 0) suggest[cat.key] = true
    }
    return suggest
  }, [family])

  const cats = useMemo(
    () => ALL_CATEGORIES.filter((c) => {
      if (c.auto === 'infants') return family.infants > 0
      if (c.auto === 'pets') return family.pets > 0
      return true
    }),
    [family],
  )

  const [autoApplied, setAutoApplied] = useState(false)
  useEffect(() => {
    if (autoApplied) return
    const toAdd = Object.keys(autoSuggest).filter((k) => !selected.includes(k))
    if (toAdd.length > 0) {
      setSelected((s) => [...s, ...toAdd])
    }
    setAutoApplied(true)
  }, [autoSuggest, selected, setSelected, autoApplied])

  const toggle = (key) => {
    setSelected((s) => s.includes(key) ? s.filter((k) => k !== key) : [...s, key])
  }

  return (
    <div className="ob-step">
      <div className="ob-title">어떤 공간의 소모품을 관리할까요?</div>
      <div className="ob-cat-grid">
        {cats.map((c) => {
          const isSelected = selected.includes(c.key)
          return (
            <button key={c.key} type="button"
              className={`ob-cat-card ${isSelected ? 'selected' : ''}`}
              onClick={() => toggle(c.key)}>
              <span className="icon">{c.icon}</span>
              <span className="label">{c.key}</span>
            </button>
          )
        })}
      </div>
      {Object.keys(autoSuggest).length > 0 && (
        <div className="ob-hint-card" style={{ marginTop: 12 }}>
          가족 구성원에 맞춰 자동 추가됐어요 (해제 가능)
        </div>
      )}
      {selected.length === 0 && (
        <div className="ob-warn">최소 1개 카테고리를 선택해주세요</div>
      )}
    </div>
  )
}

// ── 카테고리별 소모품 선택 ───────────────────────────────────
function StepCatItems({ cat, selectedItems, setSelectedItems }) {
  const catInfo = ALL_CATEGORIES.find((c) => c.key === cat)
  const items = ITEMS_BY_CATEGORY[cat] || []

  const toggleItem = (name) => {
    setSelectedItems((s) => {
      const key = `${cat}::${name}`
      const next = { ...s }
      if (next[key]) delete next[key]
      else next[key] = true
      return next
    })
  }

  const allSelected = items.every((it) => selectedItems[`${cat}::${it.name}`])
  const toggleAll = () => {
    setSelectedItems((s) => {
      const next = { ...s }
      for (const it of items) {
        const key = `${cat}::${it.name}`
        if (allSelected) delete next[key]
        else next[key] = true
      }
      return next
    })
  }

  return (
    <div className="ob-step">
      <div className="ob-title">{catInfo?.icon} {cat} 소모품을 선택해주세요</div>
      <div className="ob-subtitle">탭해서 선택하세요</div>
      <div className="ob-item-section">
        <div className="ob-section-header">
          <span>{catInfo?.icon} {cat}</span>
          <button type="button" className="ob-select-all" onClick={toggleAll}>
            {allSelected ? '전체해제' : '전체선택'}
          </button>
        </div>
        <div className="ob-chips">
          {items.map((it) => {
            const key = `${cat}::${it.name}`
            return (
              <button key={key} type="button"
                className={`ob-chip ${selectedItems[key] ? 'selected' : ''}`}
                onClick={() => toggleItem(it.name)}>
                {it.name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── 카테고리별 재고 상태 ─────────────────────────────────────
function StepCatStock({ cat, selectedItems, stockLevels, setStockLevels }) {
  const catInfo = ALL_CATEGORIES.find((c) => c.key === cat)
  const items = ITEMS_BY_CATEGORY[cat] || []

  const entries = useMemo(
    () => items
      .filter((it) => selectedItems[`${cat}::${it.name}`])
      .map((it) => ({ key: `${cat}::${it.name}`, name: it.name })),
    [cat, items, selectedItems],
  )

  if (entries.length === 0) return null

  return (
    <div className="ob-step">
      <div className="ob-title">{catInfo?.icon} {cat} 재고가 얼마나 있어요?</div>
      <div className="ob-subtitle">대략적으로 탭해주세요</div>
      <div className="ob-stock-list">
        {entries.map(({ key, name }) => {
          const current = stockLevels[key] || 'good'
          return (
            <div key={key} className="ob-stock-row">
              <div className="ob-stock-name">{name}</div>
              <div className="ob-sense-btns">
                {SENSE_LEVELS.map((l) => (
                  <button key={l.key} type="button"
                    className={`ob-sense-btn ${current === l.key ? 'active' : ''} ${l.key}`}
                    onClick={() => setStockLevels((s) => ({ ...s, [key]: l.key }))}>
                    <span className="icon">{l.icon}</span>
                    <span className="text">{l.label}</span>
                    <span className="days">{l.days}일</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 완료 ─────────────────────────────────────────────────────
function StepDone({ count }) {
  return (
    <div className="ob-step ob-done">
      <div className="ob-done-icon">✅</div>
      <div className="ob-done-title">{count}개 소모품이 등록됐어요!</div>
      <div className="ob-done-sub">재고는 언제든 탭으로 수정할 수 있어요</div>
    </div>
  )
}

// ── 메인 ─────────────────────────────────────────────────────
export default function Onboarding() {
  const { authHeaders, refreshHousehold } = useAuth()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [saveProgress, setSaveProgress] = useState({ total: 0, current: 0, name: '' })

  const [family, setFamily] = useState({ adults: 2, children: 0, infants: 0, pets: 0 })
  const [categories, setCategories] = useState(
    ALL_CATEGORIES.filter((c) => c.default).map((c) => c.key),
  )
  const [selectedItems, setSelectedItems] = useState({})
  const [stockLevels, setStockLevels] = useState({})
  const [catItemsInit, setCatItemsInit] = useState({})

  const totalSteps = 2 + categories.length * 2 + 1
  const doneStep = 2 + categories.length * 2

  useEffect(() => {
    if (step < 2 || step >= doneStep) return
    const catIdx = Math.floor((step - 2) / 2)
    const isItemStep = (step - 2) % 2 === 0
    if (!isItemStep) return
    const cat = categories[catIdx]
    if (!cat || catItemsInit[cat]) return

    const items = ITEMS_BY_CATEGORY[cat] || []
    setSelectedItems((s) => {
      const next = { ...s }
      for (const it of items) {
        const key = `${cat}::${it.name}`
        if (next[key] === undefined) next[key] = true
      }
      return next
    })
    setCatItemsInit((s) => ({ ...s, [cat]: true }))
  }, [step, categories, doneStep, catItemsInit])

  const itemCount = useMemo(
    () => Object.keys(selectedItems).filter((k) => selectedItems[k]).length,
    [selectedItems],
  )

  const canNext = useMemo(() => {
    if (step === 0) return family.adults >= 1
    if (step === 1) return categories.length > 0
    if (step >= 2 && step < doneStep) {
      const catIdx = Math.floor((step - 2) / 2)
      const isItemStep = (step - 2) % 2 === 0
      if (isItemStep) {
        const cat = categories[catIdx]
        const items = ITEMS_BY_CATEGORY[cat] || []
        return items.some((it) => selectedItems[`${cat}::${it.name}`])
      }
    }
    return true
  }, [step, family, categories, doneStep, selectedItems])

  const onNext = () => { if (step < doneStep) setStep((s) => s + 1) }
  const onBack = () => { if (step > 0) setStep((s) => s - 1) }

  const onFinish = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(family),
      })

      const people = effectivePeople({ adults: family.adults, children: family.children })
      const pets = family.pets || 0
      const entries = Object.keys(selectedItems).filter((k) => selectedItems[k])
      setSaveProgress({ total: entries.length, current: 0, name: '' })

      let ok = 0
      for (const key of entries) {
        const [cat, name] = key.split('::')
        const items = ITEMS_BY_CATEGORY[cat] || []
        const tmpl = items.find((it) => it.name === name)
        if (!tmpl) continue

        setSaveProgress({ total: entries.length, current: ok, name: tmpl.name })

        let dailyUsage
        if (tmpl.petItem && pets > 0) {
          dailyUsage = Math.round((pets / tmpl.baselineDays) * 10000) / 10000
        } else if (people > 0 && tmpl.baselineDays > 0) {
          dailyUsage = Math.round((people / tmpl.baselineDays) * 10000) / 10000
        } else {
          dailyUsage = 0.03
        }

        const sense = stockLevels[key] || 'good'
        const currentStock = senseToStock(sense, dailyUsage)

        await fetch('/api/consumables', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            name: tmpl.name,
            brand: tmpl.brand || null,
            spec: tmpl.spec || null,
            category: cat,
            current_stock: currentStock,
            daily_usage: dailyUsage,
            reorder_point: 7,
          }),
        })
        ok++
      }

      setSaveProgress({ total: entries.length, current: ok, name: '' })

      await fetch('/api/auth/onboarded', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      })

      setDone(true)
      await refreshHousehold()
    } catch (e) {
      toast(`❌ 저장 실패: ${e.message}`)
      setSaving(false)
    }
  }, [saving, authHeaders, family, selectedItems, stockLevels, toast, refreshHousehold])

  useEffect(() => {
    if (step === doneStep && !done && !saving) onFinish()
  }, [step, doneStep, done, saving, onFinish])

  if (saving && !done) {
    return (
      <div className="ob-page">
        <LoadingScreen total={saveProgress.total} current={saveProgress.current}
          currentName={saveProgress.name} />
      </div>
    )
  }

  const renderStep = () => {
    if (step === 0) return <StepFamily family={family} setFamily={setFamily} />
    if (step === 1) {
      return <StepCategories selected={categories} setSelected={setCategories} family={family} />
    }
    if (step >= 2 && step < doneStep) {
      const catIdx = Math.floor((step - 2) / 2)
      const isItemStep = (step - 2) % 2 === 0
      const cat = categories[catIdx]
      if (isItemStep) {
        return <StepCatItems key={`items-${cat}`} cat={cat}
          selectedItems={selectedItems} setSelectedItems={setSelectedItems} />
      }
      return <StepCatStock key={`stock-${cat}`} cat={cat}
        selectedItems={selectedItems} stockLevels={stockLevels} setStockLevels={setStockLevels} />
    }
    return <StepDone count={itemCount} />
  }

  const isLastCatStock = step === doneStep - 1
  const isDone = step === doneStep

  return (
    <div className="ob-page page-enter">
      <StepNav step={step} doneStep={doneStep} categories={categories} />

      <div className="ob-body">
        {renderStep()}
      </div>

      <div className="ob-footer">
        {step > 0 && !isDone && (
          <button type="button" className="btn secondary" onClick={onBack}>이전</button>
        )}
        {!isDone && !isLastCatStock && (
          <button type="button" className="btn" onClick={onNext}
            disabled={!canNext} style={{ marginLeft: 'auto' }}>다음</button>
        )}
        {isLastCatStock && (
          <button type="button" className="btn" onClick={onNext}
            style={{ marginLeft: 'auto' }}>완료</button>
        )}
        {isDone && done && (
          <button type="button" className="btn block lg"
            onClick={() => window.location.reload()}>시작하기</button>
        )}
      </div>
    </div>
  )
}
