import { useEffect, useMemo, useState } from 'react'
import BottomSheet from './BottomSheet.jsx'
import Modal from './Modal.jsx'
import { useToast } from './Toast.jsx'
import { calcDailyUsage } from '../utils/consumption.js'
import { historyBrands, historySpecs, recommendSpecs } from '../utils/brandRecommend.js'
import { formatDaysLeft, formatDailyUsage } from '../utils/stockDisplay.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { useCategories } from '../hooks/useCategories.jsx'
import { useConsumables } from '../hooks/useConsumables.jsx'

// ───────────────────────────────────────────────────────────────────────
// 메인 카드
// ───────────────────────────────────────────────────────────────────────
export default function StockCard({ item, compact, onRefresh, onStockChange, onUpdate, onDelete }) {
  const {
    name, brand, spec, current_stock, max_stock,
    daily_usage, days_left, reorder_point, need_reorder,
  } = item

  const toast = useToast()
  const { authHeaders } = useAuth()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeModal, setActiveModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showCatMove, setShowCatMove] = useState(false)

  // 컴팩트 모드 시트
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [addCustomQty, setAddCustomQty] = useState('')

  // 재고 조작 선택 상태: null | 1|2|3|4 | 'custom'
  const [selectedAdd, setSelectedAdd] = useState(null)
  const [customQty, setCustomQty] = useState('')
  const [savingStock, setSavingStock] = useState(false)

  const pct = max_stock && max_stock > 0
    ? Math.max(0, Math.min(100, (current_stock / max_stock) * 100))
    : days_left != null && reorder_point
      ? Math.max(5, Math.min(100, (days_left / (reorder_point * 3)) * 100))
      : 50

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

  const clearSelection = () => { setSelectedAdd(null); setCustomQty('') }
  const selectAdd = (n) => setSelectedAdd((prev) => (prev === n ? null : n))
  const selectCustom = () => { setSelectedAdd('custom'); setCustomQty('') }
  const selectLow = () => setSelectedAdd((prev) => (prev === 'low' ? null : 'low'))

  const handleSaveStock = async () => {
    setSavingStock(true)
    try {
      if (selectedAdd === 'low') {
        const du = Number(daily_usage) || 0
        // 정확히 7일치: current_stock = 7 × daily_usage (소수 그대로 저장 → 백엔드에서 days_left = 7)
        const newStock = du > 0 ? 7 * du : 0
        await onStockChange?.(item, newStock)
        toast('⚠️ 부족 상태로 변경됐어요')
      } else {
        const qty = selectedAdd === 'custom' ? Number(customQty) : Number(selectedAdd)
        if (!qty || qty <= 0) { toast('수량을 입력해주세요'); return }
        const base = Math.max(0, Math.floor(Number(current_stock) || 0))
        await onStockChange?.(item, base + qty)
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
      }
      clearSelection()
    } finally {
      setSavingStock(false)
    }
  }

  const canSave =
    selectedAdd === 'low' ? true :
    selectedAdd === 'custom' ? Number(customQty) > 0 :
    Number(selectedAdd) > 0

  const stockInfo = formatDaysLeft(days_left)
  const usageText = formatDailyUsage(daily_usage)

  // 빠른 액션 (컴팩트 카드용)
  const quickAdd = async (qty) => {
    if (!qty || qty <= 0) return
    const base = Math.max(0, Math.floor(Number(current_stock) || 0))
    await onStockChange?.(item, base + qty)
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
  }
  const quickLow = async () => {
    const du = Number(daily_usage) || 0
    const newStock = du > 0 ? 7 * du : 0
    await onStockChange?.(item, newStock)
    toast('⚠️ 부족 상태로 변경됐어요')
  }
  const closeAddSheet = () => {
    setAddSheetOpen(false)
    setShowAddCustom(false)
    setAddCustomQty('')
  }

  if (compact) {
    return (
      <>
        <div
          className={`stock-card stock-card-compact tap-card ${need_reorder ? 'warning' : ''}`}
          onClick={() => setDetailSheetOpen(true)}
          role="button"
          tabIndex={0}
        >
          <div className="cc-top">
            <div className="cc-name">{name}</div>
            <button
              type="button"
              className="more-btn"
              onClick={(e) => { e.stopPropagation(); setSheetOpen(true) }}
              aria-label="더보기"
            >
              ⋯
            </button>
          </div>
          <div
            className="cc-days"
            style={stockInfo ? { color: stockInfo.color } : { color: 'var(--text-sub)' }}
          >
            {stockInfo ? `${stockInfo.value}${stockInfo.unit}` : '미입력'}
          </div>
          <div className="cc-progress">
            <div
              style={{
                width: `${pct}%`,
                background: stockInfo?.color || 'var(--primary)',
              }}
            />
          </div>
          <div className="cc-actions">
            <button
              type="button"
              className="cc-btn add"
              onClick={(e) => { e.stopPropagation(); setAddSheetOpen(true) }}
              aria-label="재고 추가"
            >
              ＋
            </button>
            <button
              type="button"
              className="cc-btn low"
              onClick={(e) => { e.stopPropagation(); quickLow() }}
            >
              부족
            </button>
          </div>
        </div>

        {/* 빠른 추가 시트 */}
        <BottomSheet open={addSheetOpen} onClose={closeAddSheet} title={`${name} 추가`}>
          <div className="qty-quick-grid">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                className="qty-quick-btn"
                onClick={async () => { await quickAdd(n); closeAddSheet() }}
              >
                +{n}
              </button>
            ))}
            <button
              type="button"
              className="qty-quick-btn alt"
              onClick={() => setShowAddCustom(true)}
            >
              ✏️
            </button>
          </div>
          {showAddCustom && (
            <div className="qty-quick-custom">
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                autoFocus
                value={addCustomQty}
                onChange={(e) => setAddCustomQty(e.target.value)}
                placeholder="수량 입력"
              />
              <button
                type="button"
                className="btn"
                disabled={!(Number(addCustomQty) > 0)}
                onClick={async () => {
                  const n = Number(addCustomQty)
                  if (!n || n <= 0) return
                  await quickAdd(n)
                  closeAddSheet()
                }}
              >
                추가
              </button>
            </div>
          )}
        </BottomSheet>

        {/* 상세 정보 시트 */}
        <BottomSheet open={detailSheetOpen} onClose={() => setDetailSheetOpen(false)} title={name}>
          <div className="stock-detail-body">
            {(brand || spec) && (
              <div className="detail-meta">
                {[brand, spec].filter(Boolean).join(' · ')}
              </div>
            )}
            {usageText && (
              <div className="detail-usage">⏱ {usageText}</div>
            )}
            {stockInfo ? (
              <div className="detail-days" style={{ color: stockInfo.color }}>
                {stockInfo.value}{stockInfo.unit} 남았어요
              </div>
            ) : (
              <div className="detail-days" style={{ color: 'var(--text-sub)', fontSize: 16 }}>
                사용량 미입력
              </div>
            )}
            <div className="progress-bar">
              <div
                style={{
                  width: `${pct}%`,
                  background: stockInfo?.color || 'var(--primary)',
                }}
              />
            </div>
            {onRefresh && (
              <button
                type="button"
                className="refresh-btn"
                onClick={() => { onRefresh(item); setDetailSheetOpen(false) }}
              >
                💰 최저가 비교
              </button>
            )}
          </div>
        </BottomSheet>

        {/* 액션 메뉴 (편집/삭제 등) */}
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
              {onRefresh && (
                <button type="button" className="sheet-item" onClick={() => { onRefresh(item); closeSheet() }}>
                  <span className="icon">💰</span>
                  <span className="label">최저가 비교</span>
                  <span className="chev">›</span>
                </button>
              )}
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
                <button type="button" className="btn secondary" onClick={() => setConfirmDelete(false)}>취소</button>
                <button type="button" className="btn danger" onClick={handleDelete}>삭제</button>
              </div>
            </div>
          )}
        </BottomSheet>

        <InfoModal open={activeModal === 'info'} item={item} onClose={closeModal} onUpdate={onUpdate} />
        <ConsumptionModal open={activeModal === 'consumption'} item={item} onClose={closeModal} onUpdate={onUpdate} />
      </>
    )
  }

  return (
    <>
      <div className={`stock-card tap-card ${need_reorder ? 'warning' : ''}`}>
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
                  <div key={`${stockInfo.value}-${stockInfo.unit}`} className="phrase-main number-pop">
                    {stockInfo.value}{stockInfo.unit}
                  </div>
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
          <>
            <div className="qty-row">
              {[1, 2, 3, 4].map((n) => (
                <button key={n} type="button"
                  className={`qty-btn tap-btn ${selectedAdd === n ? 'active' : ''}`}
                  onClick={() => selectAdd(n)}
                  aria-label={`${n}개 추가`}>
                  +{n}
                </button>
              ))}
              <button type="button"
                className={`qty-btn tap-btn ${selectedAdd === 'custom' ? 'active' : ''}`}
                onClick={selectCustom}
                aria-label="직접 입력">
                ✏️
              </button>
              <button type="button"
                className={`qty-btn low tap-btn ${selectedAdd === 'low' ? 'active' : ''}`}
                onClick={selectLow}>
                부족
              </button>
            </div>

            {selectedAdd === 'custom' && (
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                autoFocus
                value={customQty}
                onChange={(e) => setCustomQty(e.target.value)}
                placeholder="수량 입력"
                className="qty-custom-input"
              />
            )}

            {selectedAdd != null && (
              <button type="button"
                className="qty-save-btn tap-btn fade-in"
                onClick={handleSaveStock}
                disabled={!canSave || savingStock}>
                {savingStock ? '저장중…' : '저장'}
              </button>
            )}
          </>
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
    </>
  )
}

// ───────────────────────────────────────────────────────────────────────
// 카테고리 이동/복사 리스트
// ───────────────────────────────────────────────────────────────────────
function CatMoveList({ item, onUpdate, onClose }) {
  const toast = useToast()
  const { categories } = useCategories()
  const currentCat = item.category || '기타'
  const linked = Array.isArray(item.linked_categories) ? item.linked_categories : []

  const onMove = async (cat) => {
    if (cat === currentCat) return
    try {
      // 이동 시 대상 카테고리가 linked 에 있으면 제거 (중복 방지)
      const nextLinked = linked.filter((c) => c !== cat)
      await onUpdate(item, { category: cat, linked_categories: nextLinked })
      toast(`📂 "${item.name}" → ${cat}`)
      onClose()
    } catch {}
  }

  const onCopy = async (cat) => {
    if (cat === currentCat) return
    if (linked.includes(cat)) return
    try {
      const nextLinked = [...linked, cat]
      await onUpdate(item, { linked_categories: nextLinked })
      toast(`📋 "${item.name}" 복사됨 → ${cat}`)
      onClose()
    } catch {}
  }

  const onRemoveLink = async (cat) => {
    try {
      const nextLinked = linked.filter((c) => c !== cat)
      await onUpdate(item, { linked_categories: nextLinked })
      toast(`🗑 "${cat}" 복사 해제됨`)
      onClose()
    } catch {}
  }

  return (
    <div>
      {categories.map((c) => {
        const isCurrent = c.key === currentCat
        const isLinked = linked.includes(c.key)
        return (
          <div key={c.key} className={`cat-row ${isCurrent ? 'active' : ''}`}>
            <span className="icon">{c.icon}</span>
            <span className="label">
              {c.key}
              {isCurrent && <span className="cat-badge current">현재</span>}
              {isLinked && <span className="cat-badge linked">복사됨</span>}
            </span>
            <div className="cat-actions">
              {isLinked ? (
                <button type="button" className="cat-action danger"
                  onClick={() => onRemoveLink(c.key)}>
                  복사 해제
                </button>
              ) : !isCurrent ? (
                <>
                  <button type="button" className="cat-action"
                    onClick={() => onMove(c.key)}>
                    이동
                  </button>
                  <button type="button" className="cat-action primary"
                    onClick={() => onCopy(c.key)}>
                    복사
                  </button>
                </>
              ) : null}
            </div>
          </div>
        )
      })}
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
  const [form, setForm] = useState(() => initConsumption(item))
  const [saving, setSaving] = useState(false)
  const [showAutoHelp, setShowAutoHelp] = useState(false)

  useEffect(() => {
    if (open) { setForm(initConsumption(item)); setShowAutoHelp(false) }
  }, [open, item])

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const onAuto = () => {
    const auto = calcDailyUsage(item.name, family)
    if (auto == null) {
      toast('자동계산 데이터가 없어요')
      return
    }
    const days = Math.max(1, Math.round(1 / auto))
    setForm((f) => ({ ...f, days_per_one: String(days) }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const n = parseInt(form.days_per_one, 10)
      await onUpdate(item, {
        daily_usage: !isNaN(n) && n > 0 ? 1 / n : null,
        reorder_point: form.reorder_point ? Number(form.reorder_point) : null,
      })
      toast('✅ 저장됨')
      onClose()
    } catch {} finally {
      setSaving(false)
    }
  }

  const suffix = {
    display: 'flex', alignItems: 'center',
    padding: '0 4px',
    fontSize: 14, fontWeight: 700, color: 'var(--text-sub)',
    flexShrink: 0,
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="소비 속도 수정"
      actions={
        <>
          <button type="button" className="btn secondary" onClick={onClose} disabled={saving}>취소</button>
          <button type="button" className="btn" onClick={handleSave} disabled={saving}>
            {saving ? '저장중…' : '저장'}
          </button>
        </>
      }
    >
      <div className="form-field">
        <label className="label">소비 주기</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={form.days_per_one}
            onChange={setField('days_per_one')}
            placeholder="7"
            style={{ flex: 1 }}
          />
          <div style={suffix}>일에 1개</div>
          <button
            type="button"
            className="btn tonal"
            onClick={onAuto}
            style={{ padding: '0 14px', fontSize: 13, borderRadius: 14, flexShrink: 0 }}
          >
            자동
          </button>
          <button
            type="button"
            onClick={() => setShowAutoHelp((v) => !v)}
            aria-label="자동 버튼 설명"
            className="auto-help-btn"
          >
            ?
          </button>
        </div>
        {showAutoHelp && (
          <div className="auto-help">
            <strong>🧠 자동 버튼이란?</strong>
            우리 집 가족 수에 맞춰 예상 소비 주기를 계산해 채워줍니다.
            <ul>
              <li>품목별 기준 (예: 화장지 60일, 샴푸 30일 — 성인 1명 기준)</li>
              <li>유효 인원 = 성인 + 어린이 × 0.7</li>
              <li>결과 = 기준 일수 ÷ 유효 인원</li>
            </ul>
            가족 정보는 <b>설정 &gt; 가족 구성</b>에서 바꿀 수 있어요.
          </div>
        )}
      </div>

      <div className="form-field" style={{ marginBottom: 0 }}>
        <label className="label">재주문 알림</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={form.reorder_point}
            onChange={setField('reorder_point')}
            placeholder="7"
            style={{ flex: 1 }}
          />
          <div style={suffix}>일 남으면</div>
        </div>
      </div>
    </Modal>
  )
}

function initConsumption(item) {
  let daysPerOne = ''
  if (item.daily_usage != null && item.daily_usage > 0) {
    daysPerOne = String(Math.max(1, Math.round(1 / item.daily_usage)))
  }
  return {
    days_per_one: daysPerOne,
    reorder_point: item.reorder_point != null ? String(item.reorder_point) : '',
  }
}
