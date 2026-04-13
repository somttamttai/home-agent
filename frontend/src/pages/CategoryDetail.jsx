import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import StockCard from '../components/StockCard.jsx'
import Modal from '../components/Modal.jsx'
import BottomSheet from '../components/BottomSheet.jsx'
import { useConsumables } from '../hooks/useConsumables.js'
import { useCategories } from '../hooks/useCategories.jsx'
import { useToast } from '../components/Toast.jsx'

const EMOJI_PICKS = ['🛁','🍳','🧺','🧹','🛏','👔','🍼','💊','🐾','🚗','🏋️','📚','🎮','🐶','🧴','🪥','🧽','🧤','🌸','☕']

export default function CategoryDetail() {
  const { name } = useParams()
  const decoded = decodeURIComponent(name || '')
  const nav = useNavigate()
  const toast = useToast()
  const { getIcon, customCategories, updateCategory, deleteCategory } = useCategories()
  const icon = getIcon(decoded)
  const isCustom = customCategories.some((c) => c.key === decoded)

  const {
    items, loading, error, reload,
    onStockChange, onUpdate, onDelete, onRefresh, reloadBrands,
  } = useConsumables()

  const filtered = useMemo(
    () => items.filter((i) => (i.category || '기타') === decoded),
    [items, decoded],
  )
  const low = filtered.filter((i) => i.need_reorder)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editName, setEditName] = useState(decoded)
  const [editIcon, setEditIcon] = useState(icon)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setEditName(decoded); setEditIcon(icon) }, [decoded, icon])

  const onEditSave = async () => {
    setSaving(true)
    try {
      await updateCategory(decoded, editName.trim(), editIcon)
      toast('✅ 카테고리 수정됨')
      setEditOpen(false)
      nav(`/category/${encodeURIComponent(editName.trim())}`, { replace: true })
    } catch { toast('❌ 수정 실패') }
    setSaving(false)
  }

  const onDeleteConfirm = async () => {
    try {
      await deleteCategory(decoded)
      toast(`🗑 "${decoded}" 삭제됨 (소모품은 기타로 이동)`)
      nav('/', { replace: true })
    } catch { toast('❌ 삭제 실패') }
  }

  return (
    <div>
      <PageHeader title={`${icon} ${decoded}`}>
        {isCustom && (
          <button type="button" className="more-btn header-more"
            onClick={() => setSheetOpen(true)} aria-label="더보기">
            ⋯
          </button>
        )}
      </PageHeader>
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

        {!loading && !error && filtered.length === 0 && (
          <div className="empty">
            <div className="big-icon">{icon}</div>
            <div className="title">이 카테고리에 등록된 소모품이 없어요</div>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <div className="section-title" style={{ paddingTop: 0 }}>
              {filtered.length}개
              {low.length > 0 && (
                <span style={{ color: 'var(--danger)', marginLeft: 8 }}>
                  · ⚠️ 부족 {low.length}개
                </span>
              )}
            </div>
            <div className="stock-card-list">
              {filtered.map((it) => (
                <StockCard key={it.id} item={it}
                  onRefresh={onRefresh} onStockChange={onStockChange}
                  onUpdate={onUpdate} onDelete={onDelete}
                  onBrandSaved={reloadBrands} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* 카테고리 관리 바텀시트 */}
      <BottomSheet open={sheetOpen} onClose={() => { setSheetOpen(false); setConfirmDelete(false) }}
        title={`${icon} ${decoded}`}>
        {!confirmDelete ? (
          <>
            <button type="button" className="sheet-item"
              onClick={() => { setSheetOpen(false); setEditOpen(true) }}>
              <span className="icon">✏️</span>
              <span className="label">카테고리 수정</span>
              <span className="chev">›</span>
            </button>
            <div className="sheet-divider" />
            <button type="button" className="sheet-item danger"
              onClick={() => setConfirmDelete(true)}>
              <span className="icon">🗑️</span>
              <span className="label">카테고리 삭제</span>
            </button>
          </>
        ) : (
          <div className="sheet-confirm">
            <div className="confirm-title">정말 삭제할까요?</div>
            <div className="confirm-msg">
              "{decoded}" 카테고리를 삭제합니다.<br />
              소모품 {filtered.length}개는 "기타"로 이동돼요.
            </div>
            <div className="confirm-actions">
              <button type="button" className="btn secondary"
                onClick={() => setConfirmDelete(false)}>취소</button>
              <button type="button" className="btn danger"
                onClick={onDeleteConfirm}>삭제</button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* 카테고리 수정 모달 */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="카테고리 수정"
        actions={<>
          <button type="button" className="btn secondary" onClick={() => setEditOpen(false)}>취소</button>
          <button type="button" className="btn" onClick={onEditSave}
            disabled={saving || !editName.trim()}>
            {saving ? '저장중…' : '저장'}
          </button>
        </>}>
        <div className="form-field">
          <label className="label">이모지</label>
          <div className="emoji-picker">
            {EMOJI_PICKS.map((e) => (
              <button key={e} type="button"
                className={`emoji-btn ${editIcon === e ? 'active' : ''}`}
                onClick={() => setEditIcon(e)}>{e}</button>
            ))}
          </div>
        </div>
        <div className="form-field" style={{ marginBottom: 0 }}>
          <label className="label">카테고리 이름</label>
          <input value={editName} onChange={(e) => setEditName(e.target.value)} />
        </div>
      </Modal>
    </div>
  )
}
