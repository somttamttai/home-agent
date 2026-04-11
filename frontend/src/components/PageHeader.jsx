import { useNavigate } from 'react-router-dom'

export default function PageHeader({ title, onBack }) {
  const nav = useNavigate()
  const handleBack = onBack || (() => nav('/'))
  return (
    <div className="page-header">
      <button type="button" className="back" onClick={handleBack} aria-label="뒤로가기">
        ←
      </button>
      <h1>{title}</h1>
      <div style={{ width: 44 }} />
    </div>
  )
}
