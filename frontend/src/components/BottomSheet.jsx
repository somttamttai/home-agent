import { useEffect } from 'react'

export default function BottomSheet({ open, onClose, title, children }) {
  // 열리면 body 스크롤 잠금
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <>
      <div className="sheet-backdrop fade-in" onClick={onClose} />
      <div className="sheet sheet-enter" role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        {title && <div className="sheet-title">{title}</div>}
        <div className="sheet-body">{children}</div>
      </div>
    </>
  )
}
