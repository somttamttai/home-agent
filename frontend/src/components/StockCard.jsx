import { useEffect, useMemo, useState } from 'react'
import BottomSheet from './BottomSheet.jsx'
import Modal from './Modal.jsx'
import { useToast } from './Toast.jsx'
import { calcDailyUsage, getBaselineDays } from '../utils/consumption.js'
import { effectivePeople, formatPeople } from '../utils/family.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { SENSE_LEVELS, stockToSense, senseToStock } from '../utils/stockMode.js'
import { useCategories } from '../hooks/useCategories.jsx'

// ───────────────────────────────────────────────────────────────────────
// 메인 카드
// ───────────────────────────────────────────────────────────────────────
export default function StockCard({ item, onRefresh, onStockChange, onUpdate, onDelete }) {
  const {
    name, brand, spec, current_stock, max_stock,
    daily_usage, days_left, reorder_point, need_reorder,
  } = item

  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeModal, setActiveModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showCatMove, setShowCatMove] = useState(false)

  const pct = max_stock && max_stock > 0
    ? Math.max(0, Math.min(100, (current_stock / max_stock) * 100))
    : days_left != null && reorder_point
      ? Math.max(5, Math.min(100, (days_left / (reorder_point * 3)) * 100))
      : 50

  const step = daily_usage && daily_usage < 1 ? 0.5 : 1

  const onMinus = () => onStockChange?.(item, Math.max(0, Number(current_stock) - step))
  const onPlus = () => onStockChange?.(item, Number(current_stock) + step)

  const closeSheet = () => {
    setSheetOpen(false)
    setConfirmDelete(false)
    setShowCatMove(false)
  }
  const openModal = (type) => {
    setSheetOpen(false)
    setConfirmDelete(false)
    setActiveModal(type)
  }
  const closeModal = () => setActiveModal(null)

  const handleDelete = async () => {
    await onDelete?.(item)
    closeSheet()
  }

  return (
    <>
      <div className={`stock-card ${need_reorder ? 'warning' : ''}`}>
        <div className="top">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="name">{name}</div>
            <div className="meta">
              {[brand, spec].filter(Boolean).join(' · ') || '\u00A0'}
            </div>
          </div>
          <div className="aside">
            <button
              type="button"
              className="more-btn"
              onClick={() => setSheetOpen(true)}
              aria-label="더보기"
            >
              ⋯
            </button>
            <div className="days">
              {days_left != null ? (
                <>
                  <div className="num">{days_left}</div>
                  <div className="unit-label">일 남음</div>
                </>
              ) : (
                <div className="none">사용량<br />미입력</div>
              )}
            </div>
          </div>
        </div>

        <div className="progress-bar">
          <div style={{ width: `${pct}%` }} />
        </div>

        {onStockChange && !max_stock && daily_usage > 0 && (
          <div className="sense-controls">
            {SENSE_LEVELS.map((l) => {
              const active = stockToSense(days_left) === l.key
              return (
                <button
                  key={l.key}
                  type="button"
                  className={`sense-btn ${active ? 'active' : ''} ${l.key}`}
                  onClick={() => onStockChange(item, senseToStock(l.key, daily_usage))}
                >
                  <span className="icon">{l.icon}</span>
                  <span className="text">{l.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {onStockChange && (max_stock > 0 || !daily_usage) && (
          <div className="stock-controls">
            <button type="button" onClick={onMinus} aria-label="재고 감소">−</button>
            <span className="current">
              {current_stock}
              {max_stock ? ` / ${max_stock}` : ''}
            </span>
            <button type="button" onClick={onPlus} aria-label="재고 증가">＋</button>
          </div>
        )}

        {onRefresh && (
          <button
            type="button"
            className="refresh-btn"
            onClick={() => onRefresh(item)}
          >
            💰 최저가 비교
          </button>
        )}
      </div>

      {/* 바텀시트 */}
      <BottomSheet open={sheetOpen} onClose={closeSheet} title={name}>
        {showCatMove ? (
          <CatMoveList item={item} onUpdate={onUpdate} onClose={closeSheet} />
        ) : !confirmDelete ? (
          <>
            <button type="button" className="sheet-item" onClick={() => openModal('info')}>
              <span className="icon">✏️</span>
              <span className="label">상품 정보 수정</span>
              <span className="chev">›</span>
            </button>
            <button type="button" className="sheet-item" onClick={() => openModal('brand')}>
              <span className="icon">🏷️</span>
              <span className="label">선호 브랜드 설정</span>
              <span className="chev">›</span>
            </button>
            <button type="button" className="sheet-item" onClick={() => openModal('consumption')}>
              <span className="icon">📊</span>
              <span className="label">소비 속도 수정</span>
              <span className="chev">›</span>
            </button>
            <button type="button" className="sheet-item" onClick={() => setShowCatMove(true)}>
              <span className="icon">📂</span>
              <span className="label">카테고리 이동</span>
              <span className="chev">›</span>
            </button>
            <div className="sheet-divider" />
            <button type="button" className="sheet-item danger" onClick={() => setConfirmDelete(true)}>
              <span className="icon">🗑️</span>
              <span className="label">삭제</span>
            </button>
          </>
        ) : (
          <div className="sheet-confirm">
            <div className="confirm-title">정말 삭제할까요?</div>
            <div className="confirm-msg">
              "{name}" 을(를) 삭제합니다.<br />
              이 작업은 되돌릴 수 없어요.
            </div>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setConfirmDelete(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={handleDelete}
              >
                삭제
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* 정보 수정 모달 */}
      <InfoModal
        open={activeModal === 'info'}
        item={item}
        onClose={closeModal}
        onUpdate={onUpdate}
      />

      {/* 선호 브랜드 모달 */}
      <BrandModal
        open={activeModal === 'brand'}
        item={item}
        onClose={closeModal}
      />

      {/* 소비 속도 모달 */}
      <ConsumptionModal
        open={activeModal === 'consumption'}
        item={item}
        onClose={closeModal}
        onUpdate={onUpdate}
      />
    </>
  )
}

// ───────────────────────────────────────────────────────────────────────
// 카테고리 이동 리스트
// ───────────────────────────────────────────────────────────────────────
function CatMoveList({ item, onUpdate, onClose }) {
  const toast = useToast()
  const { categories } = useCategories()
  const currentCat = item.category || '기타'

  const onMove = async (cat) => {
    if (cat === currentCat) return
    try {
      await onUpdate(item, { category: cat })
      toast(`📂 "${item.name}" → ${cat}`)
      onClose()
    } catch {}
  }

  return (
    <div>
      {categories.map((c) => (
        <button key={c.key} type="button"
          className={`sheet-item ${c.key === currentCat ? 'active' : ''}`}
          onClick={() => onMove(c.key)}>
          <span className="icon">{c.icon}</span>
          <span className="label">{c.key}</span>
          {c.key === currentCat && <span className="chev">✓</span>}
        </button>
      ))}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────────
// 상품 정보 수정 모달
// ───────────────────────────────────────────────────────────────────────
function InfoModal({ open, item, onClose, onUpdate }) {
  const toast = useToast()
  const { categoryKeys } = useCategories()
  const [form, setForm] = useState(() => initInfo(item))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(initInfo(item))
  }, [open, item])

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast('상품명을 입력해주세요')
      return
    }
    const oldName = item.name
    const newName = form.name.trim()

    setSaving(true)
    try {
      await onUpdate(item, {
        name: newName,
        brand: form.brand.trim() || null,
        spec: form.spec.trim() || null,
        category: form.category,
      })

      toast('✅ 상품 정보가 수정됐어요')
      onClose()
    } catch {
      // toast 는 hook 에서 이미 띄움
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="상품 정보 수정"
      actions={
        <>
          <button
            type="button"
            className="btn secondary"
            onClick={onClose}
            disabled={saving}
          >
            취소
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '저장중…' : '저장'}
          </button>
        </>
      }
    >
      <div className="form-field">
        <label className="label">상품명 <span className="required">*</span></label>
        <input value={form.name} onChange={setField('name')} />
      </div>
      <div className="form-field">
        <label className="label">브랜드</label>
        <input
          value={form.brand}
          onChange={setField('brand')}
          placeholder="예: 유한킴벌리"
        />
      </div>
      <div className="form-field">
        <label className="label">규격</label>
        <input
          value={form.spec}
          onChange={setField('spec')}
          placeholder="예: 3겹 30m 30롤"
        />
      </div>
      <div className="form-field" style={{ marginBottom: 0 }}>
        <label className="label">카테고리</label>
        <select value={form.category} onChange={setField('category')}>
          {categoryKeys.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </Modal>
  )
}

function initInfo(item) {
  return {
    name: item.name || '',
    brand: item.brand || '',
    spec: item.spec || '',
    category: item.category || '기타',
  }
}

// ───────────────────────────────────────────────────────────────────────
// 선호 브랜드 모달
// ───────────────────────────────────────────────────────────────────────
function BrandModal({ open, item, onClose }) {
  const toast = useToast()
  const { authHeaders } = useAuth()
  const [brand, setBrand] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      fetch('/api/brands', { headers: authHeaders() })
        .then((r) => r.json())
        .then((data) => setBrand((data.brands || {})[item.name] || ''))
        .catch(() => setBrand(''))
    }
  }, [open, item, authHeaders])

  const handleSave = async () => {
    setSaving(true)
    try {
      const r = await fetch('/api/brands', { headers: authHeaders() })
      const data = await r.json()
      const map = data.brands || {}
      const v = brand.trim()
      if (v) {
        map[item.name] = v
      } else {
        delete map[item.name]
      }
      await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ brands: map }),
      })
      toast(v ? `✅ "${v}" 브랜드로 저장됨` : '🗑 선호 브랜드 삭제됨')
      onClose()
    } catch {
      toast('❌ 저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="선호 브랜드 설정"
      actions={
        <>
          <button type="button" className="btn secondary" onClick={onClose} disabled={saving}>
            취소
          </button>
          <button type="button" className="btn" onClick={handleSave} disabled={saving}>
            {saving ? '저장중…' : '저장'}
          </button>
        </>
      }
    >
      <div className="form-field" style={{ marginBottom: 0 }}>
        <label className="label">{item.name} 의 선호 브랜드</label>
        <input
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="예: 유한킴벌리"
          autoFocus
        />
        <div className="form-hint">
          🏷️ 이 브랜드로 가격비교 할게요
        </div>
      </div>
    </Modal>
  )
}

// ───────────────────────────────────────────────────────────────────────
// 소비 속도 수정 모달
// ───────────────────────────────────────────────────────────────────────
function ConsumptionModal({ open, item, onClose, onUpdate }) {
  const toast = useToast()
  const { authHeaders } = useAuth()
  const [family, setFamily] = useState({ adults: 2, children: 0 })

  useEffect(() => {
    if (open) {
      fetch('/api/family', { headers: authHeaders() })
        .then((r) => r.json())
        .then((data) => setFamily({ adults: data.adults ?? 2, children: data.children ?? 0 }))
        .catch(() => {})
    }
  }, [open, authHeaders])
  const people = effectivePeople(family)

  const [form, setForm] = useState(() => initConsumption(item))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(initConsumption(item))
  }, [open, item])

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const onAuto = () => {
    const auto = calcDailyUsage(item.name, family)
    if (auto == null) {
      toast('이 상품은 자동계산 데이터가 없어요')
      return
    }
    setForm((f) => ({ ...f, daily_usage: String(auto) }))
    toast(`✨ ${formatPeople(people)}인 기준으로 자동 계산됨`)
  }

  const expDays = useMemo(() => {
    const du = parseFloat(form.daily_usage)
    if (!du || du <= 0) return null
    return Math.round(1 / du)
  }, [form.daily_usage])

  const hasBaseline = !!getBaselineDays(item.name)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onUpdate(item, {
        daily_usage: form.daily_usage ? Number(form.daily_usage) : null,
        reorder_point: form.reorder_point ? Number(form.reorder_point) : null,
      })
      toast('✅ 소비 속도가 수정됐어요')
      onClose()
    } catch {} finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="소비 속도 수정"
      actions={
        <>
          <button
            type="button"
            className="btn secondary"
            onClick={onClose}
            disabled={saving}
          >
            취소
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '저장중…' : '저장'}
          </button>
        </>
      }
    >
      <div className="form-field">
        <label className="label">일일 소비량</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={form.daily_usage}
            onChange={setField('daily_usage')}
            placeholder="0.5 (하루 반)"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn tonal"
            onClick={onAuto}
            style={{
              padding: '0 14px',
              fontSize: 13,
              borderRadius: 14,
              flexShrink: 0,
            }}
          >
            자동계산
          </button>
        </div>
        {expDays != null && (
          <div className="form-hint">
            👨‍👩‍👧 {formatPeople(people)}인 기준 약 {expDays}일 소비 예상
          </div>
        )}
        {!hasBaseline && (
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: 'var(--text-hint)',
              fontWeight: 500,
            }}
          >
            ※ 자동계산 데이터가 없는 품목은 직접 입력해주세요
          </div>
        )}
      </div>

      <div className="form-field" style={{ marginBottom: 0 }}>
        <label className="label">재주문 시점 (며칠치 남았을 때)</label>
        <input
          type="number"
          inputMode="decimal"
          step="any"
          value={form.reorder_point}
          onChange={setField('reorder_point')}
          placeholder="7"
        />
      </div>
    </Modal>
  )
}

function initConsumption(item) {
  return {
    daily_usage: item.daily_usage != null ? String(item.daily_usage) : '',
    reorder_point: item.reorder_point != null ? String(item.reorder_point) : '',
  }
}
