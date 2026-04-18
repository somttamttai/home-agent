import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme.js'
import { useConsumables } from '../hooks/useConsumables.jsx'
import { useCategories } from '../hooks/useCategories.jsx'
import Modal from '../components/Modal.jsx'
import BottomSheet from '../components/BottomSheet.jsx'
import PurchaseCompleteModal from '../components/PurchaseCompleteModal.jsx'
import EarlyPurchaseModal from '../components/EarlyPurchaseModal.jsx'
import { useToast } from '../components/Toast.jsx'
import { useAuth } from '../hooks/useAuth.jsx'

const EMOJI_PICKS = ['🛁','🍳','🧺','🧹','🛏','👔','🍼','💊','🐾','🚗','🏋️','📚','🎮','🐶','🧴','🪥','🧽','🧤','🌸','☕']

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return '좋은 새벽이에요'
  if (h < 12) return '좋은 아침이에요'
  if (h < 18) return '좋은 오후에요'
  return '좋은 저녁이에요'
}

function ddayClass(daysLeft) {
  if (daysLeft == null) return 'safe'
  if (daysLeft <= 3) return 'urgent'
  if (daysLeft <= 7) return 'warning'
  return 'safe'
}

function formatDday(daysLeft) {
  if (daysLeft == null) return '?'
  if (daysLeft < 1) return 'D-DAY'
  return `D-${Math.floor(daysLeft)}`
}

function CategoryModal({ open, onClose, onSave, initial }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📦')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(initial?.name || '')
      setIcon(initial?.icon || '📦')
    }
  }, [open, initial])

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave(name.trim(), icon)
      onClose()
    } catch {}
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? '카테고리 수정' : '카테고리 추가'}
      actions={<>
        <button type="button" className="btn secondary" onClick={onClose}>취소</button>
        <button type="button" className="btn" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? '저장중…' : '저장'}
        </button>
      </>}>
      <div className="form-field">
        <label className="label">이모지</label>
        <div className="emoji-picker">
          {EMOJI_PICKS.map((e) => (
            <button key={e} type="button"
              className={`emoji-btn ${icon === e ? 'active' : ''}`}
              onClick={() => setIcon(e)}>{e}</button>
          ))}
        </div>
      </div>
      <div className="form-field" style={{ marginBottom: 0 }}>
        <label className="label">카테고리 이름 <span className="required">*</span></label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 자동차" />
      </div>
    </Modal>
  )
}

export default function Home() {
  const nav = useNavigate()
  const { theme, toggle } = useTheme()
  const { items, loading, error, reload, onRefresh, onStockChange, onUpdate } = useConsumables()
  const { categories, getIcon, customCategories, addCategory, updateCategory, deleteCategory } = useCategories()
  const toast = useToast()
  const { authHeaders } = useAuth()

  const [addCatOpen, setAddCatOpen] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [sheetCat, setSheetCat] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteMoveTarget, setDeleteMoveTarget] = useState(null)
  const [urgentExpanded, setUrgentExpanded] = useState(false)
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false)
  const [earlyDetections, setEarlyDetections] = useState([])

  // 구매하기 링크 클릭 후 돌아왔을 때 구매완료 팝업 표시
  useEffect(() => {
    const handleFocus = () => {
      if (sessionStorage.getItem('fromCompare') === '1') {
        sessionStorage.removeItem('fromCompare')
        setPurchaseModalOpen(true)
      }
    }
    window.addEventListener('focus', handleFocus)
    // 초기 로드 시에도 체크 (탭 전환 없이 뒤로가기 한 경우)
    handleFocus()
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // 조기구매 감지
  const checkEarlyPurchase = useCallback(async (results) => {
    if (!results || results.length === 0) return
    const detections = []
    for (const { item, purchase, qty } of results) {
      try {
        const r = await fetch(`/api/purchases/${item.id}`, { headers: authHeaders() })
        if (!r.ok) continue
        const data = await r.json()
        if (data.stats.total_purchases < 3) continue
        const avgInterval = data.stats.avg_interval_days
        if (!avgInterval) continue

        // 현재 구매까지의 간격 계산
        const sorted = [...data.history].sort(
          (a, b) => new Date(b.purchased_at) - new Date(a.purchased_at),
        )
        if (sorted.length < 2) continue
        const latest = new Date(sorted[0].purchased_at)
        const prev = new Date(sorted[1].purchased_at)
        const actualInterval = (latest - prev) / (1000 * 60 * 60 * 24)

        // 평균보다 2배 이상 일찍 구매했으면 감지
        if (actualInterval < avgInterval / 2) {
          detections.push({
            item,
            purchase,
            avgInterval: Math.round(avgInterval),
            actualInterval: Math.round(actualInterval),
          })
        }
      } catch {}
    }
    if (detections.length > 0) {
      setEarlyDetections(detections)
    }
  }, [authHeaders])

  const handlePurchaseClose = useCallback((results) => {
    setPurchaseModalOpen(false)
    if (results && results.length > 0) {
      checkEarlyPurchase(results)
    }
  }, [checkEarlyPurchase])

  const handleEarlyUpdate = useCallback(async (item, _newStock, patch) => {
    if (patch) await onUpdate(item, patch)
  }, [onUpdate])

  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') Notification.requestPermission()
  }, [])

  const low = useMemo(() => items.filter((i) => i.need_reorder), [items])

  useEffect(() => {
    if (low.length === 0) return
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('⚠️ 재고 부족', {
          body: `${low.length}개 품목 주문 필요: ${low.map((i) => i.name).join(', ')}`,
          tag: 'home-agent-low-stock',
        })
      } catch {}
    }
  }, [low])

  const catKeys = useMemo(() => categories.map((c) => c.key), [categories])
  const customKeys = useMemo(() => new Set(customCategories.map((c) => c.key)), [customCategories])

  const counts = useMemo(() => {
    const c = {}
    for (const cat of catKeys) c[cat] = { total: 0, low: 0 }
    for (const it of items) {
      const cat = it.category || '기타'
      if (!c[cat]) c[cat] = { total: 0, low: 0 }
      c[cat].total += 1
      if (it.need_reorder) c[cat].low += 1
    }
    return c
  }, [items, catKeys])

  const visibleCategories = useMemo(() => {
    const withItems = catKeys.filter((c) => counts[c]?.total > 0)
    for (const c of customCategories) {
      if (!withItems.includes(c.key)) withItems.push(c.key)
    }
    // 기타: catKeys에 없지만 소모품이 있으면 표시 (기존 데이터 호환)
    if (counts['기타']?.total > 0 && !withItems.includes('기타')) {
      withItems.push('기타')
    }
    return withItems
  }, [counts, catKeys, customCategories])

  const themeIcon = theme === 'dark' ? '☀️' : '🌙'
  const safe = items.length - low.length

  const onAddCat = async (name, icon) => {
    try {
      await addCategory(name, icon)
      toast(`✅ "${name}" 카테고리 추가됨`)
    } catch (e) {
      toast(`❌ ${e.message}`)
      throw e
    }
  }

  const onEditCat = async (name, icon) => {
    if (!editCat) return
    try {
      await updateCategory(editCat, name, icon)
      toast(`✅ "${name}" 수정됨`)
    } catch (e) {
      toast(`❌ ${e.message}`)
      throw e
    }
  }

  const sheetCatItemCount = useMemo(() => {
    if (!sheetCat) return 0
    return items.filter((i) => (i.category || '기타') === sheetCat).length
  }, [sheetCat, items])

  const deletableCats = useMemo(() => {
    if (!sheetCat) return []
    return categories.filter((c) => c.key !== sheetCat)
  }, [sheetCat, categories])

  const onDeleteCat = async (moveTo) => {
    if (!sheetCat) return
    try {
      await deleteCategory(sheetCat, moveTo)
      toast(moveTo
        ? `🗑 "${sheetCat}" 삭제됨 → 소모품 "${moveTo}"로 이동`
        : `🗑 "${sheetCat}" 삭제됨 (소모품 ${sheetCatItemCount}개도 삭제)`)
      setSheetCat(null)
      setConfirmDelete(false)
      setDeleteMoveTarget(null)
    } catch (e) {
      toast(`❌ ${e.message}`)
    }
  }

  return (
    <div>
      <div className="home-header">
        <div className="greet-wrap">
          <div className="greet">{greeting()} 👋</div>
          <div className={`sub ${!loading && low.length > 0 ? 'sub-alert' : ''}`}>
            {loading
              ? '\u00A0'
              : low.length > 0
                ? (<>오늘 신경쓸 게 <span className="sub-count">{low.length}개</span>예요</>)
                : '모든 재고가 여유로워요 ✅'}
          </div>
        </div>
        <div className="header-actions">
          <button type="button" className="theme-toggle" onClick={toggle} aria-label="테마 전환">
            {themeIcon}
          </button>
          <button type="button" className="theme-toggle" onClick={() => nav('/settings')} aria-label="설정">
            ⚙️
          </button>
        </div>
      </div>

      <div className="page">
        {loading && <div className="empty">불러오는 중…</div>}

        {!loading && error && (
          <div className="empty">
            <div className="big-icon">⚠️</div>
            <div className="title">서버 연결 실패</div>
            <div style={{ marginBottom: 16 }}>{error}</div>
            <button className="btn tonal" onClick={reload}>다시 시도</button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="empty">
            <div className="big-icon">📦</div>
            <div className="title">아직 등록된 소모품이 없어요</div>
            <div style={{ marginBottom: 20 }}>하단 ＋ 버튼으로 첫 품목을 추가해보세요</div>
            <button className="btn" onClick={() => nav('/add')}>＋ 소모품 추가하기</button>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            {low.length > 0 && (
              <>
                <div className="section-title urgent-section-title" style={{ paddingTop: 0 }}>
                  <span>⚠️ 지금 필요해요</span>
                  <span className="urgent-count">{low.length}개</span>
                </div>
                {!urgentExpanded ? (
                  <div className="urgent-chips-scroll">
                    {low.slice(0, 3).map((it) => {
                      const cls = ddayClass(it.days_left)
                      const catName = it.category || '기타'
                      return (
                        <button key={it.id} type="button" className={`urgent-chip ${cls}`}
                          onClick={() => onRefresh(it)}>
                          <div className="urgent-chip-name">{it.name}</div>
                          <div className="urgent-chip-dday">{formatDday(it.days_left)}</div>
                          <div className="urgent-chip-cat">{getIcon(catName)} {catName}</div>
                        </button>
                      )
                    })}
                    {low.length > 3 && (
                      <button type="button" className="urgent-chip more"
                        onClick={() => setUrgentExpanded(true)}>
                        <div className="urgent-chip-dday">+{low.length - 3}</div>
                        <div className="urgent-chip-name">더보기</div>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="urgent-chips-expanded">
                    {low.map((it) => {
                      const cls = ddayClass(it.days_left)
                      const catName = it.category || '기타'
                      return (
                        <button key={it.id} type="button" className={`urgent-chip ${cls}`}
                          onClick={() => onRefresh(it)}>
                          <div className="urgent-chip-name">{it.name}</div>
                          <div className="urgent-chip-dday">{formatDday(it.days_left)}</div>
                          <div className="urgent-chip-cat">{getIcon(catName)} {catName}</div>
                        </button>
                      )
                    })}
                    <button type="button" className="urgent-chip more"
                      onClick={() => setUrgentExpanded(false)}>
                      <div className="urgent-chip-name">접기</div>
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="section-title" style={low.length > 0 ? {} : { paddingTop: 0 }}>전체 현황</div>
            <div className="summary-card">
              <div className="label">관리 중인 소모품</div>
              <div className="big">{items.length}<span className="unit">개</span></div>
              <div className="summary-breakdown">
                <span className="stat">✓ 여유 <strong>{safe}</strong>개</span>
                <span className="stat">⚠️ 부족 <strong>{low.length}</strong>개</span>
              </div>
            </div>

            <div className="section-title">카테고리</div>
            <div className="category-grid">
              {visibleCategories.map((cat) => {
                const c = counts[cat] || { total: 0, low: 0 }
                const hasLow = c.low > 0
                const isCustom = customKeys.has(cat)
                const go = () => nav(`/category/${encodeURIComponent(cat)}`)
                return (
                  <div key={cat} role="button" tabIndex={0}
                    className={`category-grid-card ${hasLow ? 'has-low' : ''}`}
                    onClick={go}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go() } }}>
                    <div className="icon">{getIcon(cat)}</div>
                    <div className="name">{cat}</div>
                    <div className="total">{c.total}<span className="unit">개</span></div>
                    {c.total > 0 ? (
                      <div className="breakdown">여유 {c.total - c.low} · 부족 {c.low}</div>
                    ) : (
                      <div className="breakdown" style={{ color: 'var(--text-hint)' }}>비어있음</div>
                    )}
                    {isCustom && (
                      <button type="button" className="cat-more-btn"
                        onClick={(e) => { e.stopPropagation(); setSheetCat(cat); setConfirmDelete(false) }}>
                        ⋯
                      </button>
                    )}
                  </div>
                )
              })}
              <button type="button" className="category-grid-card add-card"
                onClick={() => setAddCatOpen(true)}>
                <div className="icon">＋</div>
                <div className="name">추가</div>
              </button>
            </div>
          </>
        )}
      </div>

      <CategoryModal open={addCatOpen} onClose={() => setAddCatOpen(false)} onSave={onAddCat} />

      <CategoryModal
        open={!!editCat}
        onClose={() => setEditCat(null)}
        onSave={onEditCat}
        initial={editCat ? { name: editCat, icon: getIcon(editCat) } : null}
      />

      <BottomSheet open={!!sheetCat} onClose={() => { setSheetCat(null); setConfirmDelete(false); setDeleteMoveTarget(null) }}
        title={sheetCat ? `${getIcon(sheetCat)} ${sheetCat}` : ''}>
        {!confirmDelete ? (
          <>
            <button type="button" className="sheet-item"
              onClick={() => { setEditCat(sheetCat); setSheetCat(null) }}>
              <span className="icon">✏️</span>
              <span className="label">이름/이모지 수정</span>
              <span className="chev">›</span>
            </button>
            <div className="sheet-divider" />
            <button type="button" className="sheet-item danger"
              onClick={() => setConfirmDelete(true)}>
              <span className="icon">🗑️</span>
              <span className="label">카테고리 삭제</span>
            </button>
          </>
        ) : deleteMoveTarget === null ? (
          <div className="sheet-confirm">
            <div className="confirm-title">"{sheetCat}" 삭제</div>
            {sheetCatItemCount > 0 ? (
              <>
                <div className="confirm-msg">
                  소모품 {sheetCatItemCount}개가 있어요. 어떻게 할까요?
                </div>
                <div className="confirm-actions" style={{ flexDirection: 'column', gap: 8 }}>
                  <button type="button" className="btn" style={{ width: '100%' }}
                    onClick={() => setDeleteMoveTarget('pick')}>
                    다른 카테고리로 이동
                  </button>
                  <button type="button" className="btn danger" style={{ width: '100%' }}
                    onClick={() => onDeleteCat(null)}>
                    소모품도 함께 삭제
                  </button>
                  <button type="button" className="btn secondary" style={{ width: '100%' }}
                    onClick={() => { setConfirmDelete(false); setDeleteMoveTarget(null) }}>
                    취소
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="confirm-msg">이 카테고리에 소모품이 없어요.</div>
                <div className="confirm-actions">
                  <button type="button" className="btn secondary"
                    onClick={() => { setConfirmDelete(false); setDeleteMoveTarget(null) }}>취소</button>
                  <button type="button" className="btn danger"
                    onClick={() => onDeleteCat(null)}>삭제</button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div>
            <div className="confirm-title" style={{ padding: '0 16px 8px', fontSize: 15, fontWeight: 700 }}>
              이동할 카테고리 선택
            </div>
            {deletableCats.map((c) => (
              <button key={c.key} type="button" className="sheet-item"
                onClick={() => onDeleteCat(c.key)}>
                <span className="icon">{c.icon}</span>
                <span className="label">{c.key}</span>
              </button>
            ))}
            <div className="sheet-divider" />
            <button type="button" className="sheet-item"
              onClick={() => setDeleteMoveTarget(null)}>
              <span className="icon">←</span>
              <span className="label">뒤로</span>
            </button>
          </div>
        )}
      </BottomSheet>

      <PurchaseCompleteModal
        open={purchaseModalOpen}
        onClose={handlePurchaseClose}
        items={items}
        onStockChange={onStockChange}
      />

      <EarlyPurchaseModal
        open={earlyDetections.length > 0}
        onClose={() => setEarlyDetections([])}
        detections={earlyDetections}
        onStockChange={handleEarlyUpdate}
      />
    </div>
  )
}
