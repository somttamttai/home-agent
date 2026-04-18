import { useEffect, useMemo, useState } from 'react'
import BottomSheet from './BottomSheet.jsx'
import Modal from './Modal.jsx'
import { useToast } from './Toast.jsx'
import { calcDailyUsage, getBaselineDays } from '../utils/consumption.js'
import { effectivePeople, formatPeople } from '../utils/family.js'
import { historyBrands, historySpecs, recommendSpecs } from '../utils/brandRecommend.js'
import { formatDaysLeft, formatDailyUsage } from '../utils/stockDisplay.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { useCategories } from '../hooks/useCategories.jsx'
import { useConsumables } from '../hooks/useConsumables.jsx'

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
  const [showAddQty, setShowAddQty] = useState(false)

  const pct = max_stock && max_stock > 0
    ? Math.max(0, Math.min(100, (current_stock / max_stock) * 100))
    : days_left != null && reorder_point
      ? Math.max(5, Math.min(100, (days_left / (reorder_point * 3)) * 100))
      : 50

  const step = daily_usage && daily_usage < 1 ? 0.5 : 1

  const onMinus = () => onStockChange?.(item, Math.max(0, Number(current_stock) - step))
  const onPlus = () => setShowAddQty(true)

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

  const stockInfo = formatDaysLeft(days_left)
  const usageText = formatDailyUsage(daily_usage)

  return (
    <>
      <div className={`stock-card ${need_reorder ? 'warning' : ''}`}>
        <div className="top">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="name">{name}</div>
            <div className="meta">
              {[brand, spec].filter(Boolean).join(' · ') || '\u00A0'}
            </div>
            {usageText && (
              <div className="usage-line">⏱ {usageText}</div>
            )}
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
            <div className="days" style={stockInfo ? { color: stockInfo.color } : undefined}>
              {stockInfo ? (
                <>
                  <div className="phrase-main">{stockInfo.value}{stockInfo.unit}</div>
                  <div className="phrase-sub">남았어요</div>
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

        {onStockChange && (
          <div className="stock-controls">
            <button type="button" onClick={onMinus} aria-label="재고 감소">−</button>
            <span className="current">
              {current_stock}
              {max_stock ? ` / ${max_stock}` : ''}
            </span>
            <button type="button" onClick={onPlus} aria-label="재고 추가">＋</button>
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

      {/* 소비 속도 모달 */}
      <ConsumptionModal
        open={activeModal === 'consumption'}
        item={item}
        onClose={closeModal}
        onUpdate={onUpdate}
      />

      {/* 재고 추가 수량 팝업 */}
      <AddQuantityModal
        open={showAddQty}
        item={item}
        onClose={() => setShowAddQty(false)}
        onStockChange={onStockChange}
      />
    </>
  )
}

// ───────────────────────────────────────────────────────────────────────
// 재고 추가 수량 팝업
// ───────────────────────────────────────────────────────────────────────
const ADD_QTY_OPTIONS = [1, 2, 3, 4]

function AddQuantityModal({ open, item, onClose, onStockChange }) {
  const toast = useToast()
  const { authHeaders } = useAuth()
  const [customMode, setCustomMode] = useState(false)
  const [customQty, setCustomQty] = useState('')

  useEffect(() => {
    if (open) {
      setCustomMode(false)
      setCustomQty('')
    }
  }, [open])

  const addStock = async (qty) => {
    const newStock = Number(item.current_stock) + qty
    onStockChange(item, newStock)

    // purchase_history 저장 (gift 타입 = 직접 수정)
    try {
      await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          consumable_id: item.id,
          quantity: qty,
          purchase_type: 'gift',
          days_before_depletion: item.days_left,
        }),
      })
    } catch {}
    toast(`+${qty}개 추가됨`)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`${item.name} 추가`}>
      {!customMode ? (
        <div className="add-qty-grid">
          {ADD_QTY_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              className="btn tonal add-qty-btn"
              onClick={() => addStock(n)}
            >
              {n}개
            </button>
          ))}
          <button
            type="button"
            className="btn tonal add-qty-btn"
            onClick={() => setCustomMode(true)}
          >
            직접입력
          </button>
        </div>
      ) : (
        <div className="add-qty-custom">
          <input
            type="number"
            inputMode="numeric"
            min="1"
            autoFocus
            value={customQty}
            onChange={(e) => setCustomQty(e.target.value)}
            placeholder="수량 입력"
          />
          <button
            type="button"
            className="btn"
            disabled={!customQty || Number(customQty) <= 0}
            onClick={() => addStock(Number(customQty))}
          >
            추가
          </button>
        </div>
      )}
    </Modal>
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
  const { items } = useConsumables()
  const [form, setForm] = useState(() => initInfo(item))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(initInfo(item))
  }, [open, item])

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // 브랜드 칩: 사용자 이력이 있을 때만 최대 3개
  const brandChips = useMemo(
    () => historyBrands(items, { excludeName: item.name }),
    [items, item.name],
  )
  // 규격 칩: 상품명 기반 추천 우선, 추천 없으면 history fallback
  const specChips = useMemo(() => {
    const rec = recommendSpecs(form.name)
    if (rec.length > 0) return rec
    return historySpecs(items, { excludeName: item.name })
  }, [form.name, items, item.name])

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
        {brandChips.length > 0 && (
          <div className="brand-chips">
            {brandChips.map((b) => (
              <button key={b} type="button"
                className={`brand-chip ${form.brand.trim() === b ? 'active' : ''}`}
                onClick={() => setForm((f) => ({ ...f, brand: b }))}>
                {b}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="form-field">
        <label className="label">규격</label>
        <input
          value={form.spec}
          onChange={setField('spec')}
          placeholder="예: 3겹 30m 30롤"
        />
        {specChips.length > 0 && (
          <div className="brand-chips">
            {specChips.map((s) => (
              <button key={s} type="button"
                className={`brand-chip ${form.spec.trim() === s ? 'active' : ''}`}
                onClick={() => setForm((f) => ({ ...f, spec: s }))}>
                {s}
              </button>
            ))}
          </div>
        )}
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
// 소비 속도 수정 모달
// ───────────────────────────────────────────────────────────────────────
function ConsumptionModal({ open, item, onClose, onUpdate }) {
  const toast = useToast()
  const { family } = useCategories()
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
